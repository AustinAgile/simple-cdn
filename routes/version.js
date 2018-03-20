const router = require('express').Router();

var docker = require('docker-remote-api')
var request = docker({
	host: '/var/run/docker.sock'
});

router.get('/*', function(req, res, next) {
	request.get('/v1.24/containers/json', {json: true}, function (err, containers) {
		if (err) {return res.send(err);}
		if (containers.length < 1) {return res.send(null);}
		var re = new RegExp("\/k8s_(?!POD).+?_"+process.env.HOSTNAME+"_");
		var me = containers
			.filter(function (container) {
				return container.Names[0].match(re) != null;
			})
			.map(function (container) {
				return container;
			})
		;
		if (me.length != 1) {return res.send(null);}
		var myImageId = me[0].ImageID;
		request.get('/v1.24/images/' + me[0].ImageID + '/json', {json: true}, function (err, image) {
			if (err) {return res.send(err);}
			if (image == null) {return res.send(null);}
			if (!image.hasOwnProperty("RepoTags")) {return res.send(null);}
			if (image.RepoTags.length != 1) {return res.send(null);}
			var repoTag = image.RepoTags[0];
			var result = /:([^:]+$)/.exec(repoTag);
			if (result.length < 2) {return res.send(null);}
			res.send(result[1]);
		});
	});
});

module.exports = router;
