var AWS = require("aws-sdk");
const s3 = new AWS.S3();
var QRCode = require("qrcode-svg");

/**
 * @param {*} event - S3 PUT event
 * @param {*} context 
 * @param {*} callback 
 * @returns 
 */
module.exports.generate = async (event, context, callback) => {
  // validate input event
	if(event == null || typeof event.Records === "undefined" || event.Records.length == 0) {
		callback("Invalid/missing event parameters");
	}else {
		// get object from S3 input bucket
    let inputKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    let rawInput = await getS3Object(inputKey);
    let inputArr = csvStringToObject(rawInput.Body);

    // if no values in the input array, exit
    if(inputArr == null || inputArr.length == 0) {
      callback("No mappings found");
      return;
    }

    // output CSV string
    let reportCSV = process.env.REDIRECT_CSV_HEADER + '\n';

    const SITE_IDS = process.env.SITE_IDS.split(',');
    const SITE_HOSTNAMES = process.env.SITE_HOSTNAMES.split(',');

    // process redirects
    for(let i = 0; i < inputArr.length; i++) {
      // upload mapping
      {
        let key = process.env.S3_FOLDER_MAPPINGS + inputArr[i].site + '/' + inputArr[i].from + ".json";
        let body = JSON.stringify(inputArr[i]);
        await uploadS3Object(key, body);
      }

      // generate QR code URL and image
      let qrCodeUrl = process.env.REDIRECT_URL_SCHEME + SITE_HOSTNAMES[SITE_IDS.indexOf(inputArr[i].site)] + process.env.REDIRECT_URL_PATH + inputArr[i].from;
      let qrCodeSvgPath = process.env.S3_FOLDER_IMAGES + inputArr[i].site + '-' + inputArr[i].from + process.env.QRCODE_EXT;

      // upload QR code
      let svgImage = await generateQRCode(qrCodeUrl);

      // upload image to S3
      await uploadS3Object(qrCodeSvgPath, svgImage, process.env.QRCODE_CONTENT_TYPE);

      // add to response CSV
      inputArr[i].image = process.env.REDIRECT_URL_SCHEME + SITE_HOSTNAMES[SITE_IDS.indexOf(inputArr[i].site)] + process.env.REDIRECT_IMAGE_PATH + inputArr[i].site + '-' + inputArr[i].from + process.env.QRCODE_EXT;
      reportCSV += Object.values(inputArr[i]).join(',') + '\n';
    }//for

    // upload CSV report to S3
    {
      let key = inputKey.replace(process.env.S3_FOLDER_INPUT, process.env.S3_FOLDER_OUTPUT);
      await uploadS3Object(key, reportCSV);
      callback(null, "Success! See report: " + key);
    }
	}//else
};

/**
 * Retrieve an object from S3
 * @param {string} key 
 * @returns 
 */
async function getS3Object(key) {
  try {

		const params = {
			Bucket: process.env.S3_BUCKET,
			Key: key
		};

    return await s3.getObject(params).promise();

  } catch(err) {
    console.log(err);
		return null;
  }
}

/**
 * Upload an object to S3
 * @param {string} key 
 * @param {string} body 
 * @param {string} contentType 
 * @returns 
 */
async function uploadS3Object(key, body, contentType) {
  try {

		let params = {
			Bucket: process.env.S3_BUCKET,
			Key: key
		};

    // content body
    if (typeof body !== "undefined" || body == '') {
      params.Body = body;
    }

    // content type
    if (typeof contentType !== "undefined" || contentType == '') {
      params.ContentType = contentType;
    }

    return await s3.upload(params).promise();

  } catch(err) {
    console.log(err);
		return null;
  }
}

/**
 * Generate a QR code from a URL as an SVG image
 * @param {string} url 
 * @returns {string} the SVG string
 */
async function generateQRCode(url) {
  // if missing or invalid url, return null
  if(typeof url === "undefined" || url == '') {
    return null;
  }

  try {

    // https://www.npmjs.com/package/qrcode-svg#options
    return new QRCode({
      content: url,
      width: process.env.QRCODE_SIZE,
      height: process.env.QRCODE_SIZE,
      ecl: process.env.QRCODE_ECL, // error correction level
      padding: process.env.QRCODE_PADDING,
      join: true // minimize
    }).svg();

  } catch(err) {
    console.log(err);
    return null;
  }
}

/**
 * @typedef {Object} RedirectInputObject
 * @property {string} from - the source identifier
 * @property {string} to - the destination URL
 * @property {string} site - the site identifier
 * @property {string} statusCode - the response status code
 */
/**
 * Convert an CSV file string to a redirect object array
 * @param {string} csvString 
 * @returns {RedirectInputObject[]}
 */
function csvStringToObject(csvString) {
  // if missing or invalid CSV string
  if (typeof csvString === "undefined" || csvString == '') {
    return [];
  }

  // response object array
  let redirectInputArr = [];
  // site idenitifer array for site validation
  const validSiteIds = process.env.SITE_IDS.split(',');

  let rows = csvString.toString("utf-8").split('\n');
  for (let i = 1; i < rows.length; i++) {
    // remove carriage return
    let row = rows[i].replace('\r', '');

    // skip empty rows
    if (row == '') {
      continue;
    }

    // get columns
    let cols = row.split(',');
    
    let source_id = cols[0];
    let destination_url = cols[1];
    let site_id = cols[2];
    let status_code = cols[3];

    // if missing/invalid source/destination/site, skip
    if (typeof source_id === "undefined" || source_id == '' ||
        typeof destination_url === "undefined" || destination_url == '' ||
        typeof site_id === "undefined" || site_id == '' || validSiteIds.indexOf(site_id) == -1) {
          continue;
    }

    // set status code
    if (typeof status_code === "undefined" || status_code == '') {
      status_code = Number(process.env.REDIRECT_STATUSCODE_DEFAULT);
    }else {
      status_code = Number(status_code);
    }

    // push object to response
    redirectInputArr.push({
      from: source_id,
      to: destination_url,
      site: site_id,
      statusCode: status_code
    });
  }//for rows

  return redirectInputArr;
}
