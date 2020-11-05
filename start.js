process.title = 'pi-ctrl';

process.on('uncaughtException', function (e) {
	console.log('Uncaught Exception...');
	console.log(e.stack);
	process.exit(99);
});

var nconf = require('nconf'),
		mqtt = require('mqtt'),
		exec = require('child_process').exec;

main = function () {
	nconf.file('custom', './config.json');
	
	var mqttClient = mqtt.connect(
			nconf.get('mqtt:url'),
			nconf.get('mqtt:options')
	);

	mqttClient.on('connect', function () {
		console.log('mqtt connected');
		mqttClient.publish(
			nconf.get('mqtt:onlinemessage:topic'), 
			nconf.get('mqtt:onlinemessage:payload'),
			{
				retain: nconf.get('mqtt:onlinemessage:retain')
			}
		);

		var topics = [];
		nconf.get('commands').forEach(function (command) {
			topics.push(command.topic);
		});
		mqttClient.subscribe(topics);
	});

	mqttClient.on('message', function (topic, message) {
		console.log('< mqtt', ' ', topic, ' : ', message.toString());

		nconf.get('commands').forEach(function (command) {
			if (command.topic === topic) {
				console.log('  topic: ' + topic);

				command.messages.forEach(function (item) {
					if (item.value === '*' || item.value === message.toString()) {
						console.log('  message: ' + message.toString());

						if (item.exec) {
							var cmd = item.exec.replace('<message>', message.toString());
							console.log('  exec: ' + cmd);
							
							exec(cmd, function (error, stdout, stderr) {
								mqttClient.publish(command.statustopic, item.value, {retain: true});
							});
						}
					}
				});
			}
		});
	});
};

main();
