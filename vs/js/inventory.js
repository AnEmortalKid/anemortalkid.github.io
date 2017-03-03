$(document).foundation()


var data_table;

var priceRange;

var defaultShapes = ["Round"];
var shapesShown = new Set();
var labsShown = new Set();

$(document).ready(function() {
    loadTable();    
});

function loadTable()
{
    $.get("https://visionary-site.herokuapp.com/search/all", function(data){
        
        var response=data;
        
        data_table = $('#inventory').DataTable( {
            "data": response.data,
            "columns": [
                { "data":  "shape"},
                { "data":  "carat"},
                { "data":  "color"},
                { "data":  "clarity"},
                { "data":  "lab"},
                { "data":  "fluorescence"},
                { "data":  "price"}
            ]
        });
        
        // initialize our slider combos
        initialize_price_slider(response);
        initialize_carat_slider(response);
        dynamic_click_filters(response);
        set_default_shapes(defaultShapes);
        
        // push the filtering functions
        $.fn.dataTable.ext.search.push(
            filter_price,
            filter_carat,
            filter_shape,
            filter_lab
        );
        
        // hack to place the sort arrows closer to the text
        data_table.columns().iterator( 'column', function (ctx, idx) {
            $( data_table.column(idx).header() ).append('<span class="sort-icon"/>');
        });

        // hide the filter section now that it drew properly
        $('#filters_content').foundation('toggle');
    });    
}

function set_default_shapes(shapesArray)
{
    // uncheck everything
    $('.shapeFilter').prop('checked', false);
    shapesShown.clear();
    
    for(shape in shapesArray)
    {
        
        var shapeName = shapesArray[shape];
        $('input[value="' + shapeName + '"]').prop('checked',true);    
        shapesShown.add(shapeName);
    }    
}

function dynamic_click_filters(responseData)
{
    var statistics = responseData.statistics;
    var dataRanges = statistics.dataRanges;
        
    var shapes = dataRanges.find(function(item) {
        return item.dataRangeName==='shape';
    });
    
    var shapeValues = shapes.values;
    
    var labs = dataRanges.find(function(item) {
        return item.dataRangeName==='lab';
    });
    
    var labValues = labs.values;
    
    var shapePartitions = new Partitioner(shapeValues, 3);
    var labPartitions = new Partitioner(labValues,2);
    
    var shapeIterator = shapePartitions.getIterator();
    var labIterator = labPartitions.getIterator();
    
    var maxRows = Math.max(shapePartitions.getMaxPartitionSize(), labPartitions.getMaxPartitionSize());
    
    var dynamicDiv = $('#checkbox_dynamic');
    var rowHeaders = create_checkbox_filter_headers();
    dynamicDiv.append(rowHeaders);
    
    var columnCount = 6;
    for(row = 0; row < maxRows; row++)
    {
        var pad = 0;
        var rowElem = $('<div></div>');
        rowElem.addClass('row');
        dynamicDiv.append(rowElem);
        for(currentColumn = 0; currentColumn < columnCount; currentColumn++)
        {
                // grab from shapes
            if(currentColumn < 3)
            {
                var shape = shapeIterator.next();
                if(shape)
                {
                    var shapeCheckbox = create_checkbox_filter('shapeFilter',shape);
                    rowElem.append(shapeCheckbox);
                    shapesShown.add(shape);
                }
                else{
                    pad+=2;
                }
            }
            if(currentColumn==3)
            {
                var verticalLine = $('<div></div>');
                verticalLine.addClass('small-1 columns end');
                
                if(pad > 0)
                {
                    var offsetClass='small-offset-'+pad;
                    verticalLine.addClass(offsetClass);
                }
                
                var hr = $('<hr></hr>');
                hr.addClass('vertical');
                verticalLine.append(hr);
                rowElem.append(verticalLine);
                console.log('empty with pad:' + pad);
            }
            if(currentColumn > 3)
            {
                var lab = labIterator.next();
                if(lab)
                {
                    var labCheckbox = create_checkbox_filter('labFilter',lab);
                    
                    // shift the first guy over one
                    if(currentColumn == 4)
                    {
                        labCheckbox.addClass('small-offset-1');
                    }
                    rowElem.append(labCheckbox);
                    labsShown.add(lab);
                }             
            }
        }
    }
    
    add_shapeFilter_click();
    add_labFilter_click();    
}

function create_checkbox_filter_headers()
{
    var row = $('<div></div>');
    row.addClass('row');
    
    var shapeHeaderWrapper = $('<div></div>');
    shapeHeaderWrapper.addClass('small-1 columns');
    
    var shapeHeader=create_checkbox_header('Shape');
    row.append(shapeHeader);
    
    var labHeader = create_checkbox_header('Lab');
    labHeader.addClass('small-offset-7 end');
    row.append(labHeader);
    
    return row;
}

function create_checkbox_header(headerText)
{
    var headerWrapper = $('<div></div>');
    headerWrapper.addClass('small-1 columns');
    
    var header=$('<h5></h5>');
    header.prop('align','center');
    header.addClass('underlined');
    header.text(headerText);
    headerWrapper.append(header);
    return headerWrapper;
}

function add_shapeFilter_click()
{
     $('.shapeFilter').click(function() {
        var checked = $(this).is(':checked');
        if(checked)
        {
            shapesShown.add($(this).val())
        }
        else {
            shapesShown.delete($(this).val());
        }
        
        data_table.draw();
    });
}

function add_labFilter_click()
{
     $('.labFilter').click(function() {
        var checked = $(this).is(':checked');
        if(checked)
        {
            labsShown.add($(this).val())
        }
        else {
            labsShown.delete($(this).val());
        }
        
        data_table.draw();
    });
}

function initialize_price_slider(responseData)
{
    var statistics = responseData.statistics;
    var dataRanges = statistics.dataRanges;
        
    priceRange = dataRanges.find(function(item) {
        return item.dataRangeName==='price';
    });
    
    var min = priceRange.minValue;
    var max = priceRange.maxValue;
        
    var priceSlider = new Foundation.Slider($('#price_slider'), {
        start: min,
        end: max,
        initialStart: min,
        initialEnd: max
    });
}

function filter_price(settings, data, dataIndex)
{
    // price column is data[6]
    var min = parseInt( $('#price_min_input').val(), 10);
    var max = parseInt( $('#price_max_input').val(), 10);
    
    var price = parseFloat( data[6] ) || 0; // use data for the price column
 
        if ( ( isNaN( min ) && isNaN( max ) ) ||
             ( isNaN( min ) && price <= max ) ||
             ( min <= price   && isNaN( max ) ) ||
             ( min <= price   && price <= max ) )
        {
            return true;
        }
        
        return false;
}


function initialize_carat_slider(responseData)
{
    var statistics = responseData.statistics;
    var dataRanges = statistics.dataRanges;
        
    var caratRange = dataRanges.find(function(item) {
        return item.dataRangeName==='carat';
    });
    
    var min = caratRange.minValue;
    var max = caratRange.maxValue;
        
    var caratSlider = new Foundation.Slider($('#carat_slider'), {
        start: min,
        end: max,
        initialStart: min,
        initialEnd: max,
        step: .01
    });
}

function filter_carat(settings, data, dataIndex)
{
    // carat column is data[1]
    var min = parseFloat( $('#carat_min_input').val(), 10);
    var max = parseFloat( $('#carat_max_input').val(), 10);
    
    var carat = parseFloat( data[1] ) || 0; // use data for the carat column
 
        if ( ( isNaN( min ) && isNaN( max ) ) ||
             ( isNaN( min ) && carat <= max ) ||
             ( min <= carat   && isNaN( max ) ) ||
             ( min <= carat   && carat <= max ) )
        {
            return true;
        }
        
        return false;
}

function create_checkbox_filter(clazz, value)
{
    var checkboxColumnWrapper = $('<div></div>');
    checkboxColumnWrapper.addClass('small-2 columns');
    
    var checkboxLabel = $('<label></label>');
    
    var checkboxInput = $('<input></input>');
    checkboxInput.addClass(clazz);
    checkboxInput.prop('type','checkbox');
    checkboxInput.prop('checked',true);
    checkboxInput.prop('value', value);
    checkboxLabel.append(checkboxInput);
    checkboxLabel.append(value);
    
    checkboxColumnWrapper.append(checkboxLabel);
    return checkboxColumnWrapper;
}


function filter_shape(settings, data, dataIndex)
{
    var shape = data[0];
    if ( shapesShown.has(shape) )
    {
        return true;
    }
    return false;
}

function filter_lab(settings, data, dataIndex)
{
    var lab = data[4];
    if ( labsShown.has(lab) )
    {
        return true;
    }
    return false;
}


$(document).on('moved.zf.slider', function(){
    data_table.draw();
});