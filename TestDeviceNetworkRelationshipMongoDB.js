/**
 * Created by emliberm on 4/4/2016.
 */
var _ = require('lodash');
var DeviceNetworkRelationships = require('./DeviceNetworkRelationshipsMongoDB')

var count = 100
var start = 1
var numOfChildren = 50

var dn = new DeviceNetworkRelationships({items: 'items', topology: 'topology'});

dn.emitter.on('Connected to database', function (uriOut) {
    var id_Prefix = 'my arbitrary id'
    console.log(' uriOut: ', uriOut)
    //dn.destroyCollections()
    //dn.createCollections()
    var thisTime = new Date()
    dn.createNewRoot(thisTime, function() {
        _.map(_.range(start, count), function (a) {
            var itemToStore = {}
            itemToStore['Property ' + a] = a
            itemToStore.time = new Date()
            if (a == start) {
                dn.storeItem(itemToStore, id_Prefix + a)
                dn.addRelationship(id_Prefix + a, null, thisTime)
            } else {
                if (a % numOfChildren == 0) {
                    dn.storeItem(itemToStore, id_Prefix + a)
                    dn.addRelationship(id_Prefix + a, null, thisTime)
                } else {
                    dn.storeItem(itemToStore, id_Prefix + a)
                    dn.addRelationship(id_Prefix + a, id_Prefix + (a - 1), thisTime)
                }
            }
            if (a == count-1){
                dn.formatRelationship(thisTime, function(theTree){console.log(' tree: ', JSON.stringify(theTree, null, '\t'))})
            }
        })
    })

})



//    })
//})



