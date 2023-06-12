const _helper = require("./helper.js");
const _config = require("./config.json");

module.exports.redirect = async (event) => {

  // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html
  const { request, response } = event.Records[0].cf;

  // Enable HSTS
  response.headers[_config.Headers.StrictTransportSecurity.Key.toLowerCase()] = [
    { key: _config.Headers.StrictTransportSecurity.Key, value: _config.Headers.StrictTransportSecurity.Value }
  ];

  /*
  // for debugging - add redirect request as response header
  response.headers["x-test-redirect-request"] = [
    {
      key: "X-Test-Redirect-Request",
      value: JSON.stringify(request)
    }
  ];
  return {
    status: _config.Redirect.DefaultStatus,
    statusDescription: _config.Redirect.DefaultStatusDescription,
    headers: response.headers
  };
  */

  // fetch redirect
  const redirect = await _helper.getRedirectAsync(request);

  // if error, return default status (404)
  if (redirect == null) {
    // return default response (404)
    return {
      status: _config.Redirect.DefaultStatus,
      statusDescription: _config.Redirect.DefaultStatusDescription,
      headers: response.headers
	  };
  } else {
    // on success, set location and return redirect
    response.headers[_config.Headers.Location.Key.toLowerCase()] = [
      {
        key: _config.Headers.Location.Key,
        value: redirect.to
      }
    ];

    return {
      status: redirect.statusCode,
      statusDescription: redirect.statusDescription,
      headers: response.headers
    };
  }
};
