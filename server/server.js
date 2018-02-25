const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require("path");

const port = 7168;
const appPath = "./app-package/";
const app = express();
var tokenList = [];

app.use(express.static("image"));

app.get("/getLastVersion", function(req, res, next) {
	fs.readdir(appPath, function(error, files) {
		if(error) {
			res.send("Error");
			return;
		}
		let vers = [];
		for(let i=0; i<files.length; i++) {
			let file = files[i];
			if(/^soap-sender-(64|32)-V\d+\.\d+\.\d+.zip$/.test(file) === true) {
				let ver = file.replace(/^soap-sender-(64|32)-V(\d+\.\d+\.\d+).zip$/, "$2");
				vers.push(ver);
			}
		}
		if(vers.length === 0) {
			res.send("Error");
			return;
		}
		let last = vers[0];
		for(let i=0; i<vers.length; i++) {
			let v = vers[i].split(".");
			let l = last.split(".");
			if(parseInt(v[0]) > parseInt(l[0]) || parseInt(v[1]) > parseInt(l[1]) || parseInt(v[2]) > parseInt(l[2])) {
				last = vers[i];
			}
		}
		res.send(last).end();
	})
})

app.get("/getNewTool", function(req, res, next) {
	let ver = req.query.version;
	let type = req.query.type;
	let file = "soap-sender-" + type + "-V" + ver + ".zip";
	res.download(path.join(process.cwd(), appPath + file), file);
})


app.get("*", function(req, res) {
	res.sendFile(__dirname + "/index.html");
})

var server = app.listen(port, function() {
    console.log('SOAP Sender Server listening at port ' + port);
});

function getRandom() {
	do {
		var num = 48 + Math.round(Math.random() * (122 - 47));
	}
	while (!((num > 47 && num < 58) || (num > 64 && num < 91) || (num > 96 && num < 123)))

	return num;
}

function createToken(len) {
	var token = "";
	do {
		token += String.fromCharCode(getRandom());
	}
	while (token.length < len)

	return token;
}

function decodeToken(key) {
	var secret = 'GuessMe@Defeng';
	var decipher = crypto.createDecipher('aes192', secret);
	var dec = decipher.update(key, 'hex', 'utf8');
	dec += decipher.final('utf8');
	return dec;
}

function encodeToken(token) {
    var secret = 'GuessMe@Defeng';
    var cipher = crypto.createCipher('aes192', secret);
    var enc = cipher.update(token, 'utf8', 'hex');
    enc += cipher.final('hex');
    return enc;
}

function writeUserFile(data) {
    fs.writeFile('./users.json', JSON.stringify(data, null, '\t'), function(err) {
        if (err)
            return;
    });
}