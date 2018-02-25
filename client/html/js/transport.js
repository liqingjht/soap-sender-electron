function getBodyHeader(sessionID, action) {
	var str =
`<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
	<SOAP-ENV:Header>
		<SessionID xsi:type="xsd:string" xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance">${sessionID}</SessionID>
	</SOAP-ENV:Header>
	<SOAP-ENV:Body>
		<${action}>\n`;
	
	return str;
}

function getBodyFooter(action) {
	var str = 
`		</${action}>
	</SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

	return str;
}

function getBody(sessionID, action, params) {
	let str = "";
	if(params !== undefined && params.length > 0) {
		for(let i=0; i<params.length; i++) {
			let param = params[i];
			str += `\t\t\t<${param[0]} xsi:type="xsd:string" xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance">${param[1]}</${param[0]}>\n`
		}
	}
	return (getBodyHeader(sessionID, action) + str + getBodyFooter(action));
}

const login = [
	["NewUsername", "admin"],
	["NewPassword", "1"]
]

/*string, string, array, array*/
function requestOption(ip, method, action, headers, params) {
	let isLoginAPI = (method === "ParentalControl" && action === "Authenticate");
	let len = headers.length;
	let headObj = {};
	for(let i=0; i<len; i++) {
		headObj[headers[i][0]] = headers[i][1];
	}
	let option = {
		timeout: 15000,
		time: true,
		headers: headObj
	};
	option.headers.SOAPAction = `urn:NETGEAR-ROUTER:service:${method}:1#${action}`;
	option.body = getBody(sessionID, action, params);
	option.headers["content-length"] = option.body.length;
	option.uri = `http://${ip}/soap/server_sa/`;

	return option;
}

function updateRouterInfo(ip, msg) {
	var option = {};
	option.url = `http://${ip}/currentsetting.htm`;
	option.timeout = 2000;
	request.get(option, function(err, res, data) {
		if(!err && res.statusCode === 200) {
			data = data.toString().trim();
			let tags = ["Firmware=", "RegionTag=", "Region=", "Model=", "InternetConnectionStatus=", "ParentalControlSupported=", "SOAPVersion=", "ReadyShareSupportedLevel="];
			let keys = ["", "", "region", "modelName", "connection", "", "soapVer"];
			let tagLen = tags.length;
			let [start, end] = [0, 0];
			for(let i=0; i<tagLen-1; i++) {
				start = data.indexOf(tags[i]);
				end = data.indexOf(tags[i + 1]);
				if(start === -1 || end === -1)
					break;
				if(keys[i] !== "") {
					Vue.set(app.routerInfo, keys[i], data.slice(start + tags[i].length, end).trim());
				}
			}
			app.routerInfo;
		}
		else {
			app.$Message.warning(msg);
			Vue.set(app.routerInfo, "region", "---");
			Vue.set(app.routerInfo, "modelName", "---");
			Vue.set(app.routerInfo, "connection", "---");
			Vue.set(app.routerInfo, "soapVer", "---");
		}
	})
}

function checkSoapOption(arrs) {
	let len = arrs.length;
	if(len === 0)
		return true;
	for(let i=0; i<len; i++) {
		let arr = arrs[i];
		if(arr.length !== 2)
			return false;
		if(arr[0] === "" && arr[1] === "") {
			arrs.splice(i, 1);
			i --;
			continue;
		}
		if(arr[0] === "" || arr[1] === "") {
			return false;}
	}
	return true;
}

function checkResponCode(err, data) {
	if(err)
		return false;
	let $ = cheerio.load(data);
	let code = $("ResponseCode").text();
	if(code !== "0" && code !== "00" && code !== "000")
		return false;
	return true;
}

function sendSoap(callback) {
	let {dutIP, method, action, reqHeaders, reqParams} = app;
	let option = requestOption(dutIP, method, action, reqHeaders, reqParams);
	postFunc(option, function(err, resp, data) {
		callback(err, resp, data);
	})
}

async function sendAuth() {
	let dutIP = app.dutIP;
	let params = [
		["NewUsername", "admin"],
		["NewPassword", app.passwd],
	];
	let option = requestOption(dutIP, "ParentalControl", "Authenticate", defaultHeader(), params);
	return await postFunc(option, function(err, resp, data) {
		return checkResponCode(err, data);
	})
}

async function sendConfigStart() {
	let dutIP = app.dutIP;
	let option = requestOption(dutIP, "DeviceConfig", "ConfigurationStarted", defaultHeader(), []);
	return await postFunc(option, function(err, resp, data) {
		return checkResponCode(err, data);
	})
}

async function sendConfigFinish() {
	let dutIP = app.dutIP;
	let option = requestOption(dutIP, "DeviceConfig", "ConfigurationFinished", defaultHeader(), []);
	return await postFunc(option, function(err, resp, data) {
		return checkResponCode(err, data);
	})
}

function sendAuthForPasswd(dutIP, passwd, callback) {
	let params = [
		["NewUsername", "admin"],
		["NewPassword", passwd],
	];
	let option = requestOption(dutIP, "ParentalControl", "Authenticate", defaultHeader(), params);
	postFunc(option, function(err, resp, data) {
		callback(!checkResponCode(err, data));
	})
}

function updateDeviceInfo(ip) {
	let option = requestOption(ip, "DeviceInfo", "GetInfo", defaultHeader(), []);
	option.timeout = 1000;
	postFunc(option, function(err, res, body) {
		if(!err && res.statusCode === 200) {
			let $ = cheerio.load(body);
			let version = $("Firmwareversion").text().trim();
			let sn = $("SerialNumber").text().trim();
			Vue.set(app.routerInfo, "serialNum", sn);
			Vue.set(app.routerInfo, "version", version);
		}
		else {
			Vue.set(app.routerInfo, "serialNum", "---");
			Vue.set(app.routerInfo, "version", "---");
		}
	})
}

function postFunc(option, callback) {
	return new Promise(function (resolve, reject) {
		request.post(option, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var result = callback(false, response, body);
				resolve(result);
			} else {
				var result = callback(error, response, body);
				reject(result === undefined? false: result);
			}
		})
	})
}

function setTimings(newTiming) {
	Vue.set(app.timings, "lookup", newTiming===undefined? 0: newTiming.lookup.toFixed(3));
	Vue.set(app.timings, "socket", newTiming===undefined? 0: newTiming.socket.toFixed(3));
	Vue.set(app.timings, "connect", newTiming===undefined? 0: newTiming.connect.toFixed(3));
	Vue.set(app.timings, "response", newTiming===undefined? 0: newTiming.response.toFixed(3));
	Vue.set(app.timings, "end", newTiming===undefined? 0: newTiming.end.toFixed(3));
}

function stringifyHeader(headers) {
	let str = "";
	for(let key in headers) {
		str += `${key}: ${headers[key]}\n`;
	}
	return str;
}

function setResponDetail(resp) {
	var respHeader = `HTTP ${resp.httpVersion} ${resp.statusCode} ${resp.statusMessage}\n` + stringifyHeader(resp.headers);
	Vue.set(app.detailObj, "reqHeader", stringifyHeader(resp.request.headers));
	Vue.set(app.detailObj, "reqBody", resp.request.body);
	Vue.set(app.detailObj, "rspHeader", respHeader);
	Vue.set(app.detailObj, "rspBody", resp.body);
}

function getVersion(homepage, callback) {
	var option = {};
	option.url = homepage + "/getLastVersion";
	option.timeout = 2000;
	request.get(option, function(err, res, data) {console.log(data)
		if(!err && res.statusCode === 200) {
			data = data.trim();
			if(/^\d+\.\d+\.\d+$/.test(data) === false) {
				callback(true);
				return;
			}
			callback(false, data);
		}
		else {
			callback(true);
		}
	})
}