/**
 * @author Mike Dolbow
 * 
 * Leftover stuff from USNG script
 * 
 * Use individual comments to determine if/when to use or integrate
 * Don't deliver this with the final product
 * 
 */

//Here was my original way to determine the USNG precision from the map zoom level
function buildCoordString1(point,zLev)  {
        console.log("The lat,lng is: "+point.lat()+ ","+point.lng());
        var lnglat = {lon:point.lng(),lat:point.lat()}; //convert the gmaps latlng object to the format the USNG2 function expects
        //need best way to define precision dynamically based on zoom level
        //trying to get to 0 = 100km, 1 = 10km, 2 = 1km, 3 = 100m, 4 = 10m, 5 = 1m, ...
        //when zoom level 10 ~ 100km, 14 ~ 10km, 16 ~ 1 km, 19 ~ 100m, 22 ~ 7m
        //var precision = Math.floor((zLev/2)-6); //didn't really like this
        if (zLev<10) {precision=0;}
			else if (zLev<14) {precision=1;}
			else if (zLev<16) {precision=2;}
			else if (zLev<19) {precision=3;}
			else if (zLev<22) {precision=4;}
			else {precision=5;}
        console.log("The zoom level is: "+zLev + ". The precision is: "+precision);
        
        //...rest of the function
        }

//Here was Jim's suggestion, with some quick mods from me
		
		var inches = OpenLayers.INCHES_PER_UNIT; //Not sure how to get a non-OL replacement

		// OpenLayers Map.getResolution() returns map units (usually meters or feet) per pixel
		// StackOverflow suggested the following formula to get it from the Google zoom level
		var mapResolution = 156543.0339 * Math.cos(1.57078734) / Math.pow(2, zLev);	
		var metersPerPx = mapResolution * (inches[Map.getUnits()] * (1/inches['m'])); //There's no Map.getUnits in GMaps, so this would need work too
		
		// Math.log(10) = 2.302... to convert from Log base e to Log base 10.
		var precision = 6-Math.ceil(Math.log(metersPerPx)/2.302585092994046);
		//html += (new USNG()).fromLatLong(degrees, digits);
        //END JIM'S SUGGESTION - above line is from GeoMoose, but very similar to the way I was creating a USNG string


//function from https://google-developers.appspot.com/maps/documentation/javascript/examples/control-custom
//https://developers.google.com/maps/documentation/javascript/controls
//Attempting to use a custom control - search launch - instead of the top left pan handle
//Doesn't seem to quite work for a custom control
function SearchControl(controlDiv, map) {

  // Set CSS styles for the DIV containing the control
  controlDiv.style.padding = '5px';

  // Set CSS for the control border.
  var controlUI = document.createElement('div');
  controlUI.style.backgroundColor = 'white';
  controlUI.style.borderStyle = 'solid';
  controlUI.style.borderWidth = '2px';
  controlUI.style.cursor = 'pointer';
  controlUI.style.textAlign = 'center';
  controlUI.title = 'Click to search';
  controlDiv.appendChild(controlUI);

  // Set CSS for the control interior.
  var controlText = document.createElement('div');
  controlText.style.fontFamily = 'Arial,sans-serif';
  controlText.style.fontSize = '12px';
  controlText.style.paddingLeft = '4px';
  controlText.style.paddingRight = '4px';
  controlText.innerHTML = '<strong>Search</strong>';
  controlUI.appendChild(controlText);

  // Setup the click event listeners: simply set the map to Chicago.
  google.maps.event.addDomListener(controlUI, 'click', function() {
    //map.setCenter(chicago)
    alert("Launch the Search Dialog");
  });
}
