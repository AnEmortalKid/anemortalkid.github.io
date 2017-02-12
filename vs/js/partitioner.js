
function Partitioner(items, partitions)
{
    this.items=items;
    this.partitions=partitions;
    this.partitionSizes = createPartitions(items,partitions);
}

function createPartitions(items, partitions)
{
    var minPartitionSize = Math.floor(items.length/partitions);
    console.log('minPartitionSize:'+minPartitionSize);
    
    var carryOver = items.length % partitions;
    console.log('carryOver:'+carryOver);
    
    var partitionItems = new Array(partitions);
    
    // set all to min size
    for(i = 0; i < partitions; i++)
    {
        partitionItems[i]=minPartitionSize;
    }
    
    var partitionIndex=0;
    while(carryOver > 0)
    {
        partitionItems[partitionIndex]=minPartitionSize+1;
        carryOver--;
        partitionIndex++
    }
    
    return partitionItems;
}

Partitioner.prototype.getPartitionCount = function() 
{
    return this.partitions;
}

Partitioner.prototype.getPartitionSizes = function()
{
    return this.partitionSizes;
}

Partitioner.prototype.getMaxPartitionSize = function()
{
    return Math.max.apply(null, this.partitionSizes);
}

Partitioner.prototype.getItems = function() 
{
    return this.items;
}

Partitioner.prototype.getItemCount = function()
{
    return this.items.length;
}

Partitioner.prototype.getIterator = function()
{
    return new Iterator(this);
}


function Iterator(partitioner)
{
    this.maxItemCount = partitioner.getItemCount();
    this.items = partitioner.getItems();
    this.partitionCount = partitioner.getPartitionCount();
    
    this.itemsCounted=0;
    this.partitionItemIndex = new Array(this.partitionCount);
    
    for(i = 0; i < this.partitionCount; i++)
    {
        this.partitionItemIndex[i]=0;
    }
    
    this.partitionItems = create2DArray(this.partitionCount);
    
    var itemsInPartition=0;
    var partitionNumber=0;
    
    var partitionSizes = partitioner.getPartitionSizes();
    for(currItemIndex = 0; currItemIndex < this.maxItemCount; currItemIndex++)
    {
        var maxItemsForPartition = partitionSizes[partitionNumber];
        if(maxItemsForPartition == itemsInPartition)
        {
            partitionNumber++;
            itemsInPartition=0;
        }
        this.partitionItems[partitionNumber][itemsInPartition]=this.items[currItemIndex];
        itemsInPartition++;
    }
    
    console.log(this.partitionItems);
    
}

function create2DArray(rows) {
  var arr = [];

  for (var i=0;i<rows;i++) {
     arr[i] = [];
  }

  return arr;
}


Iterator.prototype.hasNext = function()
{
    return this.itemsCounted < this.maxItemCount;
}


Iterator.prototype.next = function()
{
    // fast return
   if ( this.itemsCounted > this.maxItemCount)
   {
       return null;
   }
   
   var partitionIndex = this.itemsCounted % this.partitionCount;  
   var currentPartitionIndex = this.partitionItemIndex[partitionIndex];
   var item = this.partitionItems[partitionIndex][currentPartitionIndex];
   this.partitionItemIndex[partitionIndex]++;
   this.itemsCounted++;
   return item;
}


