The integration of the U.S. National Grid (USNG) coordinates in online web mapping systems has only been partially implemented on a variety of web mapping pages. When not in possession of USNG standardized printed map products, one of the most difficult things to do is to take a USNG coordinate and quickly produce a basic, readable map, or visa versa: take a basic map or address and obtain a USNG coordinate.

To relieve this difficulty, Larry Moore developed a web map based on the Google Maps API that incorporated USNG coordinates (http://dhost.info/usngweb/). This project attempts to update that code to version 3 of the Google Maps API, incorporating Javascript libraries from Jim Klassen (https://github.com/klassenjs/usng_tools) and Xavier Irias (http://www.ersquared.org/). 

If you want to deploy this code on your own site, you'll need to obtain an API key from Google and replace my key with yours on line 11 of index.html. More information about the Google Maps Javascript API and API keys is available here: https://developers.google.com/maps/documentation/javascript/?hl=en_US

Due to the Google Maps billing changes coming in summer of 2018, the demonstration site is likely to stop working. Details about the changes can be found here: https://developers.google.com/maps/billing/important-updates

Contributors include Mike Dolbow and Sean Gutknecht. A demonstration page can be used at http://mmdolbow.github.io/usng-gmap-v3/
