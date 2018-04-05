function getDUTIP() {
	let ips =  getLocalIP();
	let dutIP = "";

	for(let i=0; i<ips.length; i++) {
		let ip = ips[i];
		if(ip.startsWith("192.168.") || ip.startsWith("172.16") || ip.startsWith("10.0.")) {
			if(ip.startsWith("192.168.1.") || ip.startsWith("172.16.0.") || ip.startsWith("10.0.0.")) {
				dutIP = ip;
			}
		}
	}

	if(dutIP === "" && ips.length > 0) {
		dutIP = ips[0];
	}

	return dutIP;
}

function getLocalIP() {
	let ips = [];
	let dnss = dns.getServers();

	for(let i=0; i<dnss.length; i++) {
		if(dnss[i].startsWith("172.17.92") || dnss[i].startsWith("172.22."))
			continue;
		ips.push(dnss[i]);
	}

	return ips;
}

function getUserInfo() {
    var userInfo = new Object();
    userInfo.hostname = os.hostname();
    userInfo.username = os.userInfo().username;
    var interFaces = os.networkInterfaces();
    for (let i in interFaces) {
        for (let j in interFaces[i]) {
            if (/^172\.17\./g.test(interFaces[i][j].address)) {
                userInfo.mac = interFaces[i][j].mac.toUpperCase();
            }
        }
    }
    return userInfo;
}

function layerInit() {
	var overlayNav = $('.cd-overlay-nav');
	var overlayContent = $('.cd-overlay-content');

    var diameterValue = (Math.sqrt(Math.pow($(window).height(), 2) + Math.pow($(window).width(), 2)) * 2);
    overlayNav.children('span').velocity({
        scaleX: 0,
        scaleY: 0,
        translateZ: 0,
    }, 50).velocity({
        height: diameterValue + 'px',
        width: diameterValue + 'px',
        top: -(diameterValue / 2) + 'px',
        left: -(diameterValue / 2) + 'px',
    }, 0);

    overlayContent.children('span').velocity({
        scaleX: 0,
        scaleY: 0,
        translateZ: 0,
    }, 50).velocity({
        height: diameterValue + 'px',
        width: diameterValue + 'px',
        top: -(diameterValue / 2) + 'px',
        left: -(diameterValue / 2) + 'px',
    }, 0);
}

function loadEffect(event) {
	var overlayNav = $('.cd-overlay-nav');
	var overlayContent = $('.cd-overlay-content');

    $(".cd-overlay-nav").css("left", event.clientX + "px");
    $(".cd-overlay-nav").css("top", event.clientY + "px");
    $(".cd-overlay-content").css("left", event.clientX + "px");
    $(".cd-overlay-content").css("top", event.clientY + "px");
    overlayNav.children('span').velocity({
        translateZ: 0,
        scaleX: 1,
        scaleY: 1,
    }, 650, 'easeInCubic', function() {
		app.navIndex = app.tmpNavIndex;
        overlayNav.children('span').velocity({
            translateZ: 0,
            scaleX: 0,
            scaleY: 0,
        }, 300);
    });
}

function readLogs(callback) {
	fs.readFile(logFile, 'utf-8', function(err, data) {
		try {
			if(err)
				throw new Error("read error");
			let arr = JSON.parse(data);
			callback(false, arr);
		}
		catch(err) {
			callback(true, []);
		}
	})
}

function saveLogs(arr) {
	fs.writeFile(logFile, JSON.stringify(arr, null, "\t"), "utf-8", function(err) {
		//do nothing.
	});
}

function addNewLog(model, method, action, resp, rawHeaders, rawParams) {
	if(resp === undefined || resp === null) {
		return;
	}

	let $ = cheerio.load(resp.body);
	let code = $("ResponseCode").text();
	if(code === undefined || code === "")
		code = "---";

	readLogs(function(err, arr) {
		arr.unshift({
			"httpVersion": resp.httpVersion === undefined? "1.0": resp.httpVersion,
			"statusCode": resp.statusCode === undefined? "": resp.statusCode,
			"statusMessage": resp.statusMessage === undefined? "": resp.statusMessage,
			"ipaddr": resp.request.host,
			"testTime": getPrettyTime(),
			"model": model,
			"method": method,
			"action": action,
			"costTime": resp.timings.end.toFixed(3),
			"reqHeader": stringifyHeader(resp.request.headers),
			"reqBody": resp.request.body,
			"rawHeaders": rawHeaders,
			"rawParams": rawParams,
			"resHeader": stringifyHeader(resp.headers),
			"resBody": resp.body,
			"resCode": code
		})
		if(arr.length > 500) {
			arr.splice(500 - arr.length);
		}

		saveLogs(arr);
	})
}

function formatResponse(txt) {
	if(txt === undefined)
		txt = "";
	let temp = format(txt.replace(/\r\n/g, "").replace(/\n/g, ""));
	temp = temp.replace(/^\s*$/gm, "").replace(/\n{2,}/g, "\n");
	return temp;
}

function mergeLogTxt(log, eol) {
	eol = eol === undefined? '\n': eol;
	let str = `POST http://${log.ipaddr}/soap/server_sa/ HTTP/${log.httpVersion}${eol}`;
	str += replaceEol(log.reqHeader, eol) + eol + replaceEol(log.reqBody, eol);
	str += `${eol.repeat(2)}${'-'.repeat(45)}${eol.repeat(2)}`;
	str += `HTTP ${log.httpVersion} ${log.statusCode} ${log.statusMessage}${eol}`;
	str += replaceEol(log.resHeader, eol) + eol + replaceEol(log.resBody, eol);
	return str;
}

function replaceEol(str, eol) {
	if(eol === '\n')
		return str;
	return str.replace(/\n/g, eol);
}

function bindMethodAndAction() {
	let methods = [];
	fs.readFile(soapListFile, "utf-8", function(err, data) {
		try {
			if(err)
				throw new Error();
			let arr = JSON.parse(data);
			soapList = arr;
			let len = arr.length;
			for(let i=0; i<len; i++) {
				let obj = arr[i];
				methods.push(obj.method);
			}
			app.reqMethods = methods;
			let curMethod = app.method;
			let all = getAllActions(curMethod);
			app.reqActions = all;
		}
		catch(err) {}
	})
}

function getActionsArr(method) {
	for(let i=0; i<soapList.length; i++) {
		if(soapList[i].method === method) {
			return [...soapList[i].actions];
		}
	}
	return [];
}

function getAllActions(method) {
	let rest = [];
	let actions = getActionsArr(method);
	let actLen = actions.length;
	for(let i=0; i<actLen; i++) {
		rest.push(actions[i].action);
	}
	return rest;
}

function getAllParams(action) {
	let rest = [];
	let actions = getActionsArr(app.method);
	let actLen = actions.length;
	for(let i=0; i<actLen; i++) {
		if(actions[i].action === action) {
			let params = actions[i].params;
			for(let j=0; j<params.length; j++) {
				rest.push([params[j], []]);
			}
		}
	}
	return rest;
}

function addSoapList(method, action, params) {
	setTimeout(function() {
		let actionsArr;
		for(let i=0; i<soapList.length; i++) {
			if(soapList[i].method === method) {
				actionsArr = soapList[i].actions;
			}
		}
		if(actionsArr === undefined) {
			soapList.push({"method": method, "actions": []});
			actionsArr = soapList[soapList.length - 1].actions;
		}
		let paramsArr;
		for(let i=0; i<actionsArr.length; i++) {
			if(actionsArr[i].action === action) {
				paramsArr = actionsArr[i].params;
			}
		}
		if(paramsArr === undefined) {
			actionsArr.push({"action": action, "params": []});
			paramsArr = actionsArr[actionsArr.length - 1].params;
		}
	
		paramsArr.length = 0;
		let newParams = [];
		for(let i=0; i<params.length; i++) {
			paramsArr.push(params[i][0]);
		}

		fs.writeFile(soapListFile, JSON.stringify(soapList, null, "\t"), "utf-8", function(err) {
			//do nothing
		});
	}, 200)
}

function isIPFormat(str) {
    str = str.replace(/00(\d)/g, "$1").replace(/0(\d{2})/g, "$1").replace(/0(\d)/g, "$1");
    if (/^((25[0-5]|2[0-4]\d|((1\d{2})|([1-9]?\d)))\.){3}(25[0-5]|2[0-4]\d|((1\d{2})|([1-9]?\d))){1}$/g.test(str) == false) {
        return false;
    } else {
        return str;
    }
}

function getPrettyTime() {
	let current = new Date();
	let curDay = `${current.getFullYear().toString().slice(-2)}/${current.getMonth() + 1}/${current.getDate()}`;
	curDay += ` - ${current.getHours()}:${current.getMinutes()}`;
	return curDay;
}

function vSet(obj, ...rest) {
	for(let i=0; i<rest.length; i++) {
		Vue.set(obj, rest[i][0], rest[i][1]);
	}
}