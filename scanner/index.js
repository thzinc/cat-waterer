const BeaconScanner = require('node-beacon-scanner');
const scanner = new BeaconScanner();

function objToString(obj) {
    let str = '';
    for (let p in obj) {
        if (obj.hasOwnProperty(p)) {
            str += p + '::' + obj[p] + '\n';
        }
    }
    return str;
}

let debug = false;

let deviceId = process.env.BALENA_DEVICE_UUID;
let deviceName = process.env.BALENA_DEVICE_NAME_AT_INIT;
let rssiThreshold = process.env.RSSI_THRESHOLD || -75;
let separationPeriod = process.env.SEP_PERIOD || 30;

let debugSetting = process.env.DEBUG || "false";
if (debugSetting.toLowerCase() == "true") {
    debug = true;
}


//Set the separation period
separationPeriod = separationPeriod * 1000;

//create a dictionary to track last sent datetime per tag
let lastSentDictionary = {};


scanner.onadvertisement = ad => {

    let tagId = ad.address

    if (ad.rssi > -10) {
        if (debug) { console.log("Invalid beacon received: " + ad.address + " and ignored"); }
        return;
    }

    if (ad.beaconType == "iBeacon") {
        if (ad.iBeacon.major == 0 || ad.iBeacon.minor == 0) {
            if (debug) { console.log("Beacon with invalid UUID/major/minor found. Ignoring") }
            return;
        }

        tagId = ad.iBeacon.uuid + "-" + ad.iBeacon.major + "-" + ad.iBeacon.minor;
    }
    else if (ad.beaconType == "eddystoneUid") {
        if (debug) {
            console.log("Ad: " + objToString(ad))
            console.log("EddystoneUid: " + objToString(ad.eddystoneUid))
        }
        tagId = ad.eddystoneUid.namespace + "-" + ad.eddystoneUid.instance;
    }
    else if (ad.beaconType == "eddystoneTlm") {
        if (debug) {
            console.log("Ad: " + objToString(ad))
            console.log("eddystoneTlm: " + objToString(ad.eddystoneTlm))
            console.log("Eddystone TLM beacons are not supported. Ignoring")
        }
        return;
    }
    else if (ad.beaconType == "eddystoneUrl") {
        if (debug) {
            console.log("Ad: " + objToString(ad))
            console.log("eddystoneUrl: " + objToString(ad.eddystoneUrl))
            console.log("Eddystone URL beacons are not supported. Ignoring")
        }
        return;
    }
    else {
        if (debug) {
            console.log("Other type of advertisement packet recieved. Currently not supported. Ignoring:")
            console.log(objToString(ad))
        }
        return;
    }



    if (null != rssiThreshold && ad.rssi < rssiThreshold) {
        if (debug) { console.log("Beacon for tag: " + tagId + " ignored because the RSSI was below the set threshold: " + rssiThreshold) }
        return;
    }

    if (tagId in lastSentDictionary) {
        //if this device has sent an iBeacon entry for this tag less than
        // 30 seconds ago, don't send another yet.
        let gap = (new Date) - lastSentDictionary[tagId];
        if (gap < separationPeriod) {
            if (debug) { console.log("Beacon for tag: " + tagId + " ignored because it was reported only " + gap / 1000 + "seconds ago.") }
            return;
        }
    }

    data = 'beacon,device=' + deviceId + ',deviceName=' + deviceName + ',tag=' + tagId + ' rssi=' + ad.rssi
    console.log("Beacon: " + data);

    lastSentDictionary[tagId] = new Date;
};

scanner.startScan()
    .then(() => console.log('started'))
    .catch(err => console.error('err', err));