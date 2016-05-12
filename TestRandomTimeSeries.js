/**
 * Created by emliberm on 5/10/2016.
 */
var _ = require('lodash');
var RandomTimeSeries = require('./RandomTimeSeries')

var timeSeriesPackage = new RandomTimeSeries({name:'ts'})

timeSeriesPackage.emitter.on('Connected to database', function(a) {
    console.log (' uri: ', a)
    var date1 = new Date('2010-12-10T19:15:00.000Z')


var idx = 0
    _.forEach(_.range(1000), function(a){
        console.log(' a: ', a)
        timeSeriesPackage.storeItemByTime({a:'dasd '+ a}, new Date(date1.getTime() + (a* 3600)), 'abc' + a, function() {
            idx++
            if (idx == 1000){
                timeSeriesPackage.findItemsByStartEndTime(new Date('2010-12-10T19:15:00.000Z'), new Date('2010-12-10T19:20:00.000Z'), function(b){
                    console.log('a; ', b.length)
                    timeSeriesPackage.findItem('abc15',function(b){
                        console.log('item ; ', b)
                        timeSeriesPackage.clearItems(function() {})
                    })
                })
            }
        })

    })

})
