// based on  https://github.com/Samze/uptime-pagerduty
var CheckEvent = require('../../models/checkEvent');
var PagerDuty = require('pagerduty');
var fs = require('fs');
var ejs = require('ejs');

var template = fs.readFileSync(__dirname + '/views/_detailsEdit.ejs', 'utf8');

//Convert to Set implementation
var activeAlerts = [];

exports.initWebApp = function(options) {
    var config = options.config.pagerduty;
    var pager = new PagerDuty({serviceKey:config.serviceKey});

    var addAlert = function(incident){
        activeAlerts.push(incident);
    }

    var getIncident = function(newId){
        var foundIncident;

        activeAlerts.forEach(function(incident){
            if(JSON.stringify(incident._id) === JSON.stringify(newId.toString())) {
                foundIncident = incident;
            }
        });

        return foundIncident;
    }

    var incidentExists = function(newId){
        return getIncident(newId) === undefined ? false : true;
    }

    CheckEvent.on('afterInsert', function(checkEvent) {
        checkEvent.findCheck(function(findErr, check) {
            var pdOptions = check.getPollerParam("pagerduty_options");
            if (!pdOptions || !pdOptions.send_alerts) return;
            if(!check.isUp){
                pager.create({
                    incidentKey: checkEvent._id,
                    description: 'Uptime down: ' + check.name,
                    details:'Automatic alert generated by Blendom: ' + checkEvent.message,
                    callback: function(err,response){
                        if(err){
                            console.log(err);
                        } else {
                            console.log(response);
                            addAlert({ _id : check._id, incident_key : response.incident_key});
                        }
                    }
                });
            } else if(check.isUp && config.autoresolve){
                if(incidentExists(check._id)){
                    var incident = getIncident(check._id);
                    var incident_key = incident.incident_key;
                    pager.resolve({
                        incidentKey : incident_key,
                        description: 'Uptime up: ' + check.name,
                        details:'Automatic alert generated by Blendom: ' + checkEvent.message,
                        callback: function(err,response){
                            if(err){
                                console.log(err);
                            } else {
                                console.log(response);
                            }
                        }
                    });
                }
            }
        });
    });

    var dashboard = options.dashboard;
    
    dashboard.on('checkEdit', function(type, check, partial) {
        var pagerduty_options = check.getPollerParam("pagerduty_options") || {};
        partial.push(ejs.render(template, { locals: { check: check, pagerduty_options: pagerduty_options } }));
    });

    dashboard.on('populateFromDirtyCheck', function(checkDocument, dirtyCheck, type) {
        if (!dirtyCheck.pagerduty_options) return;
        checkDocument.setPollerParam('pagerduty_options', dirtyCheck.pagerduty_options);
    });
}
