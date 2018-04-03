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
function requestOption(ip, method, action, headers, params, timeout) {
	if(timeout === undefined)
		timeout = 15000;
	else
		timeout = parseInt(timeout) * 1000;
	let isLoginAPI = (method === "ParentalControl" && action === "Authenticate");
	let len = headers.length;
	let headObj = {};
	for(let i=0; i<len; i++) {
		headObj[headers[i][0]] = headers[i][1];
	}
	let option = {
		timeout: timeout,
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
			let tags = ["Region", "Model", "InternetConnectionStatus", "SOAPVersion", "LoginMethod"];
			let keys = ["region", "modelName", "connection", "soapVer", "loginMethod"];
			data = data.replace(/\r*\n|\s+/g, '\r');
			let items = data.split('\r');
			let tagLen = tags.length;
			for(let i=0; i<tagLen; i++) {
				for(let j=0; j<items.length; j++) {
					if(items[j].startsWith(tags[i])) {
						let val = items[j].split('=')[1];
						Vue.set(app.routerInfo, keys[i], val);
					}
				}
			}
		}
		else {
			app.$Message.warning(msg);
			vSet(app.routerInfo, ...[
				["region", "---"],
				["modelName", "---"],
				["connection", "---"],
				["soapVer", "---"],
				["loginMethod", "---"]
			])
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
		if(arr[0] === "") {
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
	let {dutIP, method, action, reqHeaders, reqParams, timeout} = app;
	let option = requestOption(dutIP, method, action, reqHeaders, reqParams, timeout);
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
	let option = requestOption(dutIP, "ParentalControl", "Authenticate", defaultHeader(), params, 2);
	return await postFunc(option, function(err, resp, data) {
		return checkResponCode(err, data);
	})
}

async function sendConfigStart() {
	let dutIP = app.dutIP;
	let option = requestOption(dutIP, "DeviceConfig", "ConfigurationStarted", defaultHeader(), [], 2);
	return await postFunc(option, function(err, resp, data) {
		return checkResponCode(err, data);
	})
}

async function sendConfigFinish() {
	let dutIP = app.dutIP;
	let option = requestOption(dutIP, "DeviceConfig", "ConfigurationFinished", defaultHeader(), [], 2);
	return await postFunc(option, function(err, resp, data) {
		return checkResponCode(err, data);
	})
}

function sendAuthForPasswd(dutIP, passwd, callback) {
	let params = [
		["NewUsername", "admin"],
		["NewPassword", passwd],
	];
	let option = requestOption(dutIP, "ParentalControl", "Authenticate", defaultHeader(), params, 2);
	postFunc(option, function(err, resp, data) {
		callback(!checkResponCode(err, data));
	})
}

function sendSoapLogin(dutIP, passwd, callback) {
	let params = [
		["Username", "admin"],
		["Password", passwd],
	];
	let option = requestOption(dutIP, "DeviceConfig", "SOAPLogin", defaultHeader(), params, 2);
	postFunc(option, function(err, resp, data) {
		callback(!checkResponCode(err, data), resp);
	})
}

function sendSoapLogout(dutIP, cookie, callback) {
	let headers = defaultHeader();
	headers.push(['Cookie', cookie]);
	let option = requestOption(dutIP, "DeviceConfig", "SOAPLogout", headers, [], 2);
	postFunc(option, function(err, resp, data) {
		callback(!checkResponCode(err, data));
	})
}

function updateDeviceInfo(ip) {
	let option = requestOption(ip, "DeviceInfo", "GetInfo", defaultHeader(), [], 1);
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
				reject(result === undefined? '': result);
			}
		})
	})
}

function setTimings(newTiming) {
	if(newTiming === undefined)
		return;
	let {lookup=0, socket=0, connect=0, response=0, end=0} = newTiming;
	vSet(app.timings, ...[
		["lookup", lookup.toFixed(3)],
		["socket", socket.toFixed(3)],
		["connect", connect.toFixed(3)],
		['response', response.toFixed(3)],
		['end', end.toFixed(3)]
	])
}

function stringifyHeader(headers) {
	let str = "";
	for(let key in headers) {
		str += `${key}: ${headers[key]}\n`;
	}
	return str;
}

function getCookie(resp) {
	if(resp === undefined || resp.headers === undefined)
		return '';
	let headers = resp.headers;
	let cookie = '';
	for(let key in headers) {
		let temp = key.toLowerCase();
		if(temp === 'set-cookie') {
			let arr = headers[temp];
			for(let j=0; j<arr.length; j++) {
				if(arr[j].includes('jwt_local')) {
					cookie = arr[j];
				}
			}
		}
	}
	return cookie;
}

function setResponDetail(resp) {
	if(resp === undefined)
		return;
	let {httpVersion = '1.0', statusCode = '500', statusMessage = 'Unknown Error'} = resp;
	var respHeader = `HTTP ${resp.httpVersion} ${resp.statusCode} ${resp.statusMessage}\n` + stringifyHeader(resp.headers);
	if(statusCode === '500')
		return;
	Vue.set(app.detailObj, "reqHeader", stringifyHeader(resp.request.headers));
	Vue.set(app.detailObj, "reqBody", resp.request.body);
	Vue.set(app.detailObj, "rspHeader", respHeader);
	Vue.set(app.detailObj, "rspBody", resp.body);
}

function getVersion(homepage, callback) {
	var option = {};
	option.url = homepage + "/getLastVersion";
	option.timeout = 2000;
	request.get(option, function(err, res, data) {
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
