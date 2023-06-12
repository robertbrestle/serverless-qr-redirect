const _config = require("./config.json");
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: _config.S3.Region });

module.exports.getRedirectAsync = async (request) => {
	// get filename from path
	let filename = getFilename(request);
	if (filename == '') {
		return null;
	}

    // if request headers do not contain x-hostname
    if (typeof request.headers[_config.Headers.XHostname.Key.toLowerCase()] === "undefined") {
        return null;
    }

    // get x-hostname value for siteId mapping
    let hostname = request.headers[_config.Headers.XHostname.Key.toLowerCase()][0].value;
    let siteId = _config.SiteIdMapping[hostname];

	// get redirect file from S3
	let s3Redirect = await getS3ObjectJSON(filename, siteId);
	if (s3Redirect == null) {
		return null;
	}

	// ensure we should redirect
	const shouldRedirect = !!(
		s3Redirect &&
		s3Redirect.to &&
		_config.SupportedStatusCodes[s3Redirect.statusCode]
	);

	// invalid redirect, return
	if (!shouldRedirect) {
		return null;
	}

	// add status description
	s3Redirect.statusDescription = _config.SupportedStatusCodes[s3Redirect.statusCode];
    
	// if destination is path, append default domani
	if (s3Redirect.to[0] == '/') {
		s3Redirect.to = _config.Redirect.DefaultScheme + hostname + s3Redirect.to;
	}

	// if no query present, append utm_source query parameter
	if (s3Redirect.to.indexOf('?') < 0) {
		s3Redirect.to += _config.Redirect.DefaultRedirectQuery;
	}

	return s3Redirect;
};

/**
 * Fetch the file nbame from the request input object
 * @param {object} request 
 * @returns {string} the file name
 */
function getFilename(request) {
	return request.uri.replace(_config.Redirect.InputPathPrefix, '').split('/')[0];
};

/**
 * Fetch the S3 mapping file and return it as JSON
 * @param {string} filename - the input file name
 * @param {string} siteId - the site identifier
 * @returns mapping JSON
 */
async function getS3ObjectJSON(filename, siteId) {
	try {
		const params = {
			Bucket: _config.S3.Bucket,
			Key: _config.S3.Folder + siteId + '/' + filename + _config.S3.Extension
		};
		let response = await s3.getObject(params).promise();
		return JSON.parse(response.Body.toString('utf-8'));
	}catch(err) {
		return null;
	}
}
