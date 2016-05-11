/**
 * Created by emliberm on 4/4/2016.
 */
var _ = require('lodash');
var DeviceNetworkRelationships = require('./DeviceNetworkRelationships')
//var dn = new DeviceNetworkRelationships({items: 'items', topology: 'topology'})

var dn = new DeviceNetworkRelationships({items: 'testi', topology: 'testt'})

var count = 1000
var start = 1
var numOfChildren = 20

var id_Prefix = 'my arbitrary id'

//dn.destroyCollections()
dn.createCollections()

_.map(_.range(start, count), function (a) {
    var itemToStore = {}
    itemToStore['Property ' + a] = a
    itemToStore.time = new Date()
    if (a == start) {
        dn.storeItem(itemToStore, id_Prefix + a, function (itm) {
            dn.addRelationship(id_Prefix + a, null, function (c) {
            })
        })
    } else {
        if (a % numOfChildren == 0) {
            dn.storeItem(itemToStore, id_Prefix + a, function (itm) {
                dn.addRelationship(id_Prefix + a, null, function (c) {
                })
            })
        } else {
            dn.storeItem(itemToStore, id_Prefix + a, function (itm) {
                dn.addRelationship(id_Prefix + a, id_Prefix + (a - 1), function (c) {
                })
            })
        }
    }
})

dn.formatRelationship(function (s) {
    console.log(' # of root elements: ', s.length)
    console.log('The final result.. The tree:\n',JSON.stringify(s))
    //dn.destroyCollections()
})
//    })
//})



