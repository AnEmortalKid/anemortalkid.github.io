var response;
var data_table;

var priceRange;

$(document).ready(function() {
    loadTrustarData();
});

function loadTrustarData()
{
    $.get("https://visionary-site.herokuapp.com/search/trustar/", function(data){
        
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
                { "data":  "price"}
            ]
        });
        
        // initialize our slider combos
        initialize_price_slider(response);
        
        // push the filtering functions
        $.fn.dataTable.ext.search.push(
            filter_price
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
    // price column is data[5]
    
    var min = parseInt( $('#price_min_input').val(), 10);
    var max = parseInt( $('#price_max_input').val(), 10);
    
    var price = parseFloat( data[5] ) || 0; // use data for the age column
 
        if ( ( isNaN( min ) && isNaN( max ) ) ||
             ( isNaN( min ) && price <= max ) ||
             ( min <= price   && isNaN( max ) ) ||
             ( min <= price   && price <= max ) )
        {
            return true;
        }
        
        return false;
}

$(document).on('moved.zf.slider', function(){
    data_table.draw();
});

    