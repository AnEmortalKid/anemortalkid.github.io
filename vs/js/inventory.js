var response;
var data_table;

var priceRange;
var caratRange;
var shapes;

var shapesShown = new Set();

$(document).ready(function() {
    loadTrustarData();
});

function loadTrustarData()
{
    // 
    // http://localhost:8080/search/trustar/
    $.get("https://visionary-site.herokuapp.com/search/trustar", function(data){
        
        // store it up higher so we can do some functions later
        response=data;
        
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
        initialize_shape_filters(response);
        
        // push the filtering functions
        $.fn.dataTable.ext.search.push(
            filter_price,
            filter_carat,
            filter_shape
        );
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
        
    caratRange = dataRanges.find(function(item) {
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

function initialize_shape_filters(responseData)
{
    var statistics = responseData.statistics;
    var dataRanges = statistics.dataRanges;
        
    shapes = dataRanges.find(function(item) {
        return item.dataRangeName==='shape';
    });
    
    var shapeValues = shapes.values;
    
    // create the elements
    for(i=0; i < shapeValues.length; i++)
    {
        shapesShown.add(shapeValues[i]);    
    }
    
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
    
    console.log(shapesShown);    
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



$(document).on('moved.zf.slider', function(){
    data_table.draw();
});

    