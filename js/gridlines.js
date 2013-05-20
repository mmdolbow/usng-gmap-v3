/**
*  gridlines.js (calculate and display U.S. National Grid zones and gridlines)
*
****************************************************************************
 *
 * Originally by Larry Moore
 * Updated for version 3 of the Google Maps API by Mike Dolbow
 * HAS:
 * 1. All GLatLng replaced with google.maps.LatLng
 * 2. Width and Opacity on PolyLines switched with Opacity and Width
 * 3. All GPolyline replaced with google.maps.Polyline
 * 4. new GOverlay(); lines replaced with new google.maps.OverlayView();
 * 5. Added this.lat_line[i-1].setMap(this.map); and this.lng_line[i-1].setMap(this.map); For Zone Lines
 * 6. Replaced all prototype.remove with prototype.onRemove
 * 7. Figured out prototype.lats and prototype.lngs functions not consistently working, trying 
 *    lat_coords, and lng_coords, instead, in certain places
 * 
 * NEEDS:
 * 1. Not sure if #5 above is going to work, needs testing before continuing with other types
 * 2. Review of Custom Overlays via https://developers.google.com/maps/documentation/javascript/overlays#CustomOverlays
 *    Probably need to evaluate everything in usngzonelines.prototype.onAdd
 * 3. A bunch of ending semicolons! ;-)
 * 4. A way to consistently add the polylines. In the onAdd function, if we send the paths off to a different function, it only works if we
 *    uncheck and re-check the box (otherwise only draws one line). If we build the this.lat_line polyline, then we can't send off to
 *    the different function because the path is a full object instead of just an array.
 * 	Same for if we call addPolyLine with the lat_line, except only one line gets drawn no matter what. At least we're creating the line properly.
 * */


var x1;
var y1;
var allPolyLines = [];

//Debugging Functions - add markers at latlngs created inside functions. Can kill this when finished debugging.
function addMarker(location) {
  marker = new google.maps.Marker({
    position: location,
    map: map
  });
}

//Try adding polyline with this separate function
//This only works the second time through because the draw function hasn't been called yet! Right?
function addPolyLine(inpath)  {
  console.log("In the addPolyLine func. The path is: "+inpath.toString()); //path is different each time
  var thisLine = new google.maps.Polyline({
    path: inpath,
    strokeColor: '#0000FF',
    strokeOpacity: 0.2,
    strokeWeight: 3
  });

  thisLine.setMap(map); //this.map_ doesn't work here
  //allPolyLines.push(thisLine);
}



///////////////////////  begin class usngviewport ///////////////////////////////////////
//
// class that keeps track of the viewport context
// unlike most of the other classes in this module, does *not* implement a Google Maps custom overlay
// stores the corner coordinates of the viewport, and coordinate information
//     that defines the top-level MGRS/USNG zones within the viewport
// usngviewport is a geographic rectangle (bounded by parallels and meridians).  zone lines and
//     grid lines are computed within and clipped to this rectangle

function usngviewport(mygmap) {   // mygmap is an instance of google.map, created by calling function

   // arrays that hold the key coordinates...corners of viewport and UTM zone boundary intersections
   console.log("Inside the usngviewport function.");
   this.lat_coords = new Array();
   this.lng_coords = new Array();

   // array that holds instances of the class usng_georectangle, for this viewport
   this.georectangle = new Array();

   // call to Google Maps to get the boundaries of the map
   this.bounds = mygmap.getBounds();
   // geographic coordinates of edges of viewport
   this.slat = this.bounds.getSouthWest().lat();
   this.wlng = this.bounds.getSouthWest().lng();
   this.nlat = this.bounds.getNorthEast().lat();
   this.elng = this.bounds.getNorthEast().lng();

   // UTM is undefined beyond 84N or 80S, so this application defines viewport at those limits
   if (this.nlat > 84) { this.nlat=84; }  

   // first zone intersection inside the southwest corner of the map window
   // longitude coordinate is straight-forward...

   var x1 = (Math.floor((this.wlng/6)+1)*6.0);

   // but latitude coordinate has three cases
   if (this.slat < -80) {  // far southern zone; limit of UTM definition
      y1 = -80;
   }
   else { 
       var y1 = (Math.floor((this.slat/8)+1)*8.0);
   }

   // compute lines of UTM zones -- geographic lines at 6x8 deg intervals

   // local variables
   var j, lat, lng;

   // compute the latitude coordinates that belong to this viewport
   if (this.slat < -80) { this.lat_coords[0] = -80 }  // special case of southern limit
   else { this.lat_coords[0] = this.slat }  // normal case

   for (lat=y1, j=1; lat < this.nlat; lat+=8, j++) {
      if (lat <= 72) {
         this.lat_coords[j] = lat;
      }
      else if (lat <= 80) {
         this.lat_coords[j] = 84;
      }
      else { j-- }
   }
   this.lat_coords[j] = this.nlat;

   // compute the longitude coordinates that belong to this viewport
   this.lng_coords[0] = this.wlng;
   if (this.wlng < this.elng) {   // normal case
      for (lng=x1, j=1; lng < this.elng; lng+=6, j++) {
         this.lng_coords[j] = lng;
      }
   }
   else { // special case of window that includes the international dateline
      for (lng=x1, j=1; lng <= 180; lng+=6, j++) {
         this.lng_coords[j] = lng;
      }
      for (lng=-180; lng < this.elng; lng+=6, j++) {
         this.lng_coords[j] = lng;
      }
   }

   this.lng_coords[j++] = this.elng;

   // store corners and center point for each geographic rectangle in the viewport
   // each rectangle may be a full UTM cell, but more commonly will have one or more
   //    edges bounded by the extent of the viewport
   // these geographic rectangles are stored in instances of the class 'usng_georectangle'
   var k = 0;
   for (i=0; i<this.lat_coords.length-1; i++) {
      for (j=0; j<this.lng_coords.length-1; j++) {
         if (this.lat_coords[i]>=72 && this.lng_coords[j]==6) {  } // do nothing
         else if (this.lat_coords[i]>=72 && this.lng_coords[j]==18) {  } // do nothing
         else if (this.lat_coords[i]>=72 && this.lng_coords[j]==30) {  } // do nothing
         else {
            this.georectangle[k] = new usng_georectangle();
            this.georectangle[k].assignCorners(this.lat_coords[i], this.lat_coords[i+1], this.lng_coords[j], this.lng_coords[j+1]);
            if (this.lat_coords[i] != this.lat_coords[i+1]) {  // ignore special case of -80 deg latitude
               this.georectangle[k].assignCenter();
            }
            k++;
         }
      }
   }
} // end of function usngviewport()

// return array of latitude coordinates corresponding to lat lines
usngviewport.prototype.lats = function() {
   return this.lat_coords;
}

// return array of longitude coordinates corresponding to lng lines
usngviewport.prototype.lngs = function() {
   return this.lng_coords;
}

// return an array or georectangles associated with this viewprot
usngviewport.prototype.geoextents = function() {
   return this.georectangle;
}

////////////////////// end class usngviewport /////////////////////////////////



///////////////////// class to draw UTM zone lines/////////////////////////

// zones are defined by lines of latitude and longitude, normally 6 deg wide by 8 deg high
// northern-most zone is 12 deg high, from 72N to 84N

// usngzonelines is implemented as a Google Maps custom overlay

function usngzonelines(viewport,color,opacity,width,map) { 
   
   this.view = viewport;
   this.color = color;
   this.opacity = opacity;
   this.map_ = map;
   
   //Larry's originally had this.width = Math.floor(width*(3/4));
   //here as this line, with width originally being passed in as the last variable. 
   //But map.getZoom() was the only variable left that he was passing in...so it doesn't quite make sense to set a width here
   this.width = Math.floor(width*(3/4));
   
   //GMaps suggests we define a property to hold the image's
   // div and leave it null to start
   this.div_ = null;
   
	// Explicitly call setMap on this overlay
	this.setMap(map); 
   
}

usngzonelines.prototype = new google.maps.OverlayView();

//Larry originally had all of these elements inside an initialize function, attempting to switch to onAdd
//Gmaps doesn't pass any parameters into this function in their example
//Firebug says 'map' is undefined inside this function, so what happens if we just comment out all the this.map_ stuff?
usngzonelines.prototype.onAdd = function(map) {
   console.log("We have started the onAdd function for usngzonelines.");
   //this.map_ = map;
   this.lat_line = new Array();
   this.lng_line = new Array();
   this.temp1 = new Array();
   this.temp2 = new Array();
   this.temp3 = new Array();
   this.latlines = this.view.lats();
   this.lnglines = this.view.lngs();
   this.gzd_rectangles = this.view.geoextents();
   this.marker = new Array();

	console.log("Latitude lines are: "+this.latlines.toString());
	//console.log("Longitude lines are: "+this.lnglines.toString());

// creates polylines corresponding to zone lines using arrays of lat and lng points for the viewport
//Larry originally started this for loop with i=1, why not 0?
   for (var i=1; i<this.latlines.length; i++) {
   	
   	//this.temp1.length = 0;//not sure if this is functioning to empty the temp1 array or not
      for (var j=0; j<this.lnglines.length; j++) {   
         this.temp1[j] = new google.maps.LatLng(this.latlines[i],this.lnglines[j]);
          //console.log("Lat lines j="+j);
          //addMarker(this.temp1[j]); //this works to show markers at all the intersections
      }
      //this.lat_line.push(this.temp1);//try setting lat_line just to the array that defines the path
      //console.log("Lat lines i="+i);
      //At this point the temp1 path is different every time
      console.log("Inside the onAdd function latlines loop, adding polyline for array"+this.temp1.toString());
      //this.lat_line[i-1] = new google.maps.Polyline({path:this.temp1,strokeColor:this.color,strokeOpacity:this.opacity,strokeWeight:this.width}); //setting the lat_line here doesn't work well
      
      this.lat_line.push(this.temp1); 
      
      
      //addPolyLine(this.temp1); //execute the setMap elsewhere.
      //Above Works but only for one heavy polyline on the first run. 
      //Then we can uncheck and check the box and get the other lines!! Why?
      this.temp1.length = 0; //you would think this would empty the array so it can be filled again, but actually this kills all of it, unless you run it again!!
   } //end for loop of each lat line
   
   //at this point, the lat_line array doesn't hold different stuff. It's a right-sized array all with one element
   
  

	//console.log("First New Polyline created with path:"+this.lat_line[0].getPath());

//Paste back in long functions here after debugging the lat functions
   
}  // function onAdd

// google custom overlays require a draw function, Larry originally used zonedraw and
//    just did draw is a dummy function with { return; }
// let's try putting Larry's zonedraw code into this one
usngzonelines.prototype.draw = function () {
console.log("Launching the draw function.");

// draw latitude lines
   for (var i=0; i<this.lat_line.length; i++) {
   	//So if lat_line just holds an array of coordinates, why can't we addPolyLine here?
   	//If we empty temp1 in onAdd with .length=0, then There is nothing in this array - at least, not a string of latlongs
   	//If we don't empty temp1 in onAdd, this is all the same string, just the last one through
   	console.log("We be lookin at this lat line is: "+this.lat_line[i].toString());
   	addPolyLine(this.lat_line[i]);
   	
   	
   	//Inside this function, all lat lines are the same. The right number exist in the array, but they are all the same
    //console.log("Inside draw func, creating New Polyline with:"+this.lat_line[i].getPath().getAt(0).toString()); 
   
    //Let's see if we can just call setMap
    //this.lat_line[i].setMap(this.map_);
     
      if (i>0) {
      	//var dbugPath = this.lat_line[i].getPath();
      	//var dbugLatLng = dbugPath.getAt(0);
      	//addMarker(dbugLatLng);
      	//console.log("First lat long on lat line "+i+" is :"+dbugLatLng.toString()); //this just shows the same line over and over again
      	
         //this.lat_line[0].setMap(this.map_);
         //this.lat_line[i-1].setMap(this.map_);
         //this.map_.addOverlay(this.lat_line[0]);   // bug...don't understand why this is necessary
         //this.map_.addOverlay(this.lat_line[i-1]);
      }
   }

   // draw longitude lines
   for (i=0; i<this.lng_line.length; i++) {
      if (i>0) {
         this.lng_line[0].setMap(map);
         this.lng_line[i-1].setMap(map);
         //this.map_.addOverlay(this.lng_line[0]);   // bug...don't understand why this is necessary
         //this.map_.addOverlay(this.lng_line[i-1]);
      }
   }
}

// Larry' original function to draw utm zone lines
usngzonelines.prototype.zonedraw = function() {
   // draw latitude lines
   for (var i=0; i<this.lat_line.length; i++) {
      if (i>0) {
         this.map_.addOverlay(this.lat_line[0]);   // bug...don't understand why this is necessary
         this.map_.addOverlay(this.lat_line[i-1]);
      }
   }

   // draw longitude lines
   for (i=0; i<this.lng_line.length; i++) {
      if (i>0) {
         this.map_.addOverlay(this.lng_line[0]);   // bug...don't understand why this is necessary
         this.map_.addOverlay(this.lng_line[i-1]);
      }
   }
}

usngzonelines.prototype.onRemove = function() {
   // remove latitude lines
   /* temporarily comment this out until getting the add works right
   for (var i=0; i<this.lat_line.length; i++) {
      this.map_.removeOverlay(this.lat_line[i]);
   }

   // remove longitude lines
   for (i=0; i<this.lng_line.length; i++) {
      this.map_.removeOverlay(this.lng_line[i]);
   }
   // remove center-point label markers
   if (this.marker) {
      for (i=0; i<this.marker.length; i++) {
         this.map_.removeOverlay(this.marker[i]);
      }
   }
   */
} 

usngzonelines.prototype.zonemarkerremove = function() {
   // remove center-point label markers
   if (this.marker) {
      for (i=0; i<this.marker.length; i++) {
         this.map_.removeOverlay(this.marker[i]);
      }
   }
}

// zone label markers
usngzonelines.prototype.zonemarkerdraw = function() {
   for (var i=0; i<this.gzd_rectangles.length; i++) {
      lat = this.gzd_rectangles[i].getCenter().lat();
      lng = this.gzd_rectangles[i].getCenter().lng();

       // labeled marker
       var z = LLtoUSNG(lat,lng,1);
       z = z.substring(0,3);
       opts = { 
          "icon": iconRectangle,
          "clickable": false,
          "labelText": z,
          "labelOffset": new GSize(-15, -11)
       };
       this.marker[i] = new LabeledMarker(new google.maps.LatLng(lat,lng),opts);
       this.map_.addOverlay(this.marker[i]);
   }
}  

/////////////////end of class that draws zone lines and markers///////////////////////////////

///////////////////// class to draw 100,000-meter grid lines/////////////////////////
	
function grid100klines(viewport,color,width,opacity) { 
   this.view = viewport
   this.color = color
   this.width = width
   this.opacity = opacity
   this.zonelines = new Array()
   this.zones = new Array()
   this.gridcell_100k = new Array()
}

grid100klines.prototype = new google.maps.OverlayView();

grid100klines.prototype.initialize = function(map) {
   this.map = map
   // zone lines are also the boundaries of 100k lines...separate instance of this class for 100k lines
   this.zonelines = new usngzonelines(this.view,this.color, this.opacity,this.width)
   this.map.addOverlay(this.zonelines)
   this.zonelines.zonedraw()

   this.zones = this.view.geoextents()
   for (var i=0; i<this.zones.length; i++) {
     this.gridcell_100k[i] = new gridcell(this.map, this.zones[i],100000)
     this.gridcell_100k[i].drawOneCell()
   }

}

grid100klines.prototype.onRemove = function() {
   this.map.removeOverlay(this.zonelines)
   for (var i=0; i<this.zones.length; i++) {
      this.gridcell_100k[i].remove()
   }
}

grid100klines.prototype.copy = function() {  }

grid100klines.prototype.redraw = function() {  }

grid100klines.prototype.draw100k = function() {
      
}


/////////////end class grid100klines ////////////////////////////////////////



///////////////////// class to draw 1,000-meter grid lines/////////////////////////

function grid1klines(viewport,color,width,opacity) { 
   this.view = viewport
   this.color = color
   this.width = width
   this.opacity = opacity
   this.zonelines = new Array()
   this.zones = new Array()
   this.gridcell_1k = new Array()
}

grid1klines.prototype = new google.maps.OverlayView();

grid1klines.prototype.initialize = function(map) {
   this.map = map
   // zone lines are also the boundaries of 1k lines...separate instance of this class for 1k lines
//   this.zonelines = new usngzonelines(this.view,this.color, this.width+2, this.opacity)
//   this.map.addOverlay(this.zonelines)
//   this.zonelines.zonedraw()

   this.zones = this.view.geoextents()
   for (var i=0; i<this.zones.length; i++) {
       this.gridcell_1k[i] = new gridcell(this.map, this.zones[i],1000)
     this.gridcell_1k[i].drawOneCell()
   }

}

grid1klines.prototype.onRemove = function() {

   // remove zone lines
   this.map.removeOverlay(this.zonelines)
   // remove 1k grid lines
   for (var i=0; i<this.zones.length; i++) {
      this.gridcell_1k[i].remove()
   }
}

grid1klines.prototype.copy = function() {  }

grid1klines.prototype.redraw = function() {  }

grid1klines.prototype.draw1k = function() {
      
}


/////////////end class grid1klines ////////////////////////////////////////


///////////////////// class to draw 100-meter grid lines/////////////////////////

function grid100mlines(viewport,color,width,opacity) { 
   this.view = viewport
   this.color = color
   this.width = width
   this.opacity = opacity
   this.zonelines = new Array()
   this.zones = new Array()
   this.gridcell_100m = new Array()
}

grid100mlines.prototype = new google.maps.OverlayView();

grid100mlines.prototype.initialize = function(map) {
   this.map = map
   this.zones = this.view.geoextents()
   for (var i=0; i<this.zones.length; i++) {
       this.gridcell_100m[i] = new gridcell(this.map, this.zones[i],100)
     this.gridcell_100m[i].drawOneCell()
   }

}

grid100mlines.prototype.onRemove = function() {

   // remove zone lines
   this.map.removeOverlay(this.zonelines)
   // remove 100-m grid lines
   for (var i=0; i<this.zones.length; i++) {
      this.gridcell_100m[i].remove()
   }
}

grid100mlines.prototype.copy = function() {  }

grid100mlines.prototype.redraw = function() {  }

grid100mlines.prototype.draw100m = function() {
      
}


/////////////end class grid100mlines ////////////////////////////////////////


///////////////////////// class usng_georectangle//////////////////////////
function usng_georectangle() {
   this.nlat = 0
   this.slat = 0
   this.wlng=0
   this.elng=0
   this.centerlat=0
   this.centerlng=0
}

usng_georectangle.prototype.assignCorners = function(slat,nlat,wlng,elng) {
   this.nlat = nlat;
   this.slat = slat;

   // special case: Norway
   if (slat==56 && wlng==0) {
      this.wlng = wlng;
      this.elng = elng-3
   }
   else if (slat==56 && wlng==6) {
      this.wlng = wlng-3;
      this.elng = elng
   }
   // special case: Svlabard
   else if (slat==72 && wlng==0) {
      this.wlng = wlng;
      this.elng = elng+3
   }
   else if (slat==72 && wlng==12) {
      this.wlng = wlng-3;
      this.elng = elng+3
   }
   else if (slat==72 && wlng==36) {
      this.wlng = wlng-3;
      this.elng = elng
   }
   else {
      this.wlng = wlng;
      this.elng = elng
   }
}

usng_georectangle.prototype.assignCenter = function() {
      this.centerlat = (this.nlat+this.slat)/2;
      this.centerlng = (this.wlng+this.elng)/2;
}
usng_georectangle.prototype.getCenter = function() {
      return(new google.maps.LatLng(this.centerlat,this.centerlng))
}

usng_georectangle.prototype.getNW = function() {
      return(new google.maps.LatLng(this.nlat,this.wlng))
}
usng_georectangle.prototype.getSW = function() {
      return(new google.maps.LatLng(this.slat,this.wlng))
}
usng_georectangle.prototype.getSE = function() {
      return(new google.maps.LatLng(this.slat,this.elng))
}
usng_georectangle.prototype.getNE = function() {
      return(new google.maps.LatLng(this.nlat,this.elng))
}
//////////////////////////////////////////////////////////////////////////////



///////////////////// class to calculate and draw grid lines ///////////////////////

// constructor
function gridcell(map,zones,interval) { 
  this.map = map
  this.slat = zones.slat
  this.wlng = zones.wlng
  this.nlat = zones.nlat
  this.elng = zones.elng
  this.interval = interval
  this.gridlines = new Array()
  this.marker100k = new Array()
  this.marker1k = new Array()
}

// instance of one utm cell
gridcell.prototype.drawOneCell = function() {
   var utmcoords = new Array()
   var zone = getZoneNumber((this.slat+this.nlat)/2,(this.wlng+this.elng)/2)
   var i,j,k,m,n,p,q

   LLtoUTM(this.slat,this.wlng,utmcoords,zone)
   var sw_utm_e = (Math.floor(utmcoords[0]/this.interval)*this.interval)-this.interval
   var sw_utm_n = (Math.floor(utmcoords[1]/this.interval)*this.interval)-this.interval

   LLtoUTM(this.nlat,this.elng,utmcoords,zone)
   var ne_utm_e = (Math.floor(utmcoords[0]/this.interval+1)*this.interval)+this.interval
   var ne_utm_n = (Math.floor(utmcoords[1]/this.interval+1)*this.interval)+this.interval

   var geocoords = new Object();
   var temp = new Array();
   var temp1 = new Array();
   var gr100kCoord = new Array()
   var northings = new Array()
   var eastings = new Array()

   // set density of points on grid lines
   // case 1: zoomed out a long way; not very dense
   if (this.map.getZoom() < 12 ) {
	precision = 10000
   }
   // case 2: zoomed in a long way
   else if (this.map.getZoom() > 15) {
       precision = 100;
   }
   // case 3: in between, zoom levels 12-15
   else {
       precision = 1000
   }

   // for each e-w line that covers the cell, with overedge
   northings[0] = this.slat
   k=1
   for (i=sw_utm_n, j=0; i<ne_utm_n; i+=this.interval,j++) {

      // collect coords to be used to place markers
      // '2*this.interval' is a fudge factor that approximately offsets grid line convergence
      UTMtoLL(i,sw_utm_e+(2*this.interval),zone,geocoords)
      if ((geocoords.lat > this.slat) && (geocoords.lat < this.nlat)) {
          northings[k++] = geocoords.lat
      }
      // calculate  line segments of one e-w line
      for (m=sw_utm_e,n=0; m<=ne_utm_e; m+=precision,n++) {
         UTMtoLL(i,m,zone,geocoords)
         temp[n] = new google.maps.LatLng(geocoords.lat,geocoords.lon)
         }
      // clipping routine...eliminate overedge lines
      //    case of final point in the array is not covered
      for (p=0, q=0; p<temp.length-1; p++) {
          if (this.checkClip(temp,p)) {
              gr100kCoord[q++] = temp[p]
          }
      }
      if (this.interval == 100000) {
         this.gridlines[j] = new google.maps.Polyline(gr100kCoord,k100_linecolor, k100_linewidth, k100_lineopacity)
      }
      else if (this.interval == 1000) {
         this.gridlines[j] = new google.maps.Polyline(gr100kCoord,k1_linecolor, k1_linewidth, k1_lineopacity)
      }
      else if (this.interval == 100) {
         this.gridlines[j] = new google.maps.Polyline(gr100kCoord,m100_linecolor, m100_linewidth, m100_lineopacity)
      }
      this.map.addOverlay(this.gridlines[0])
      this.map.addOverlay(this.gridlines[j])

      // clear array that holds coordinates
      for (n=0; gr100kCoord[n]; n++) { gr100kCoord[n] = null; };
    }
    northings[k++] = this.nlat
    eastings[0] = this.wlng
    k=1

   // for each n-s line that covers the cell, with overedge
   for (i=sw_utm_e; i<ne_utm_e; i+=this.interval,j++) {

      // collect coords to be used to place markers
      // '2*this.interval' is a fudge factor that approximately offsets grid line convergence
      UTMtoLL(sw_utm_n+(2*this.interval),i,zone,geocoords)
      if (geocoords.lon > this.wlng && geocoords.lon < this.elng) {
          eastings[k++] = geocoords.lon
      }

      for (m=sw_utm_n,n=0; m<=ne_utm_n; m+=precision,n++) {
         UTMtoLL(m,i,zone,geocoords)
         temp1[n] = new google.maps.LatLng(geocoords.lat,geocoords.lon)
      }
      // clipping routine...eliminate overedge lines
      for (p=0, q=0; p<temp1.length-1; p++) {
          if (this.checkClip(temp1,p)) {
              gr100kCoord[q++] = temp1[p]
          }
      }

      if (this.interval == 100000) {
         this.gridlines[j] = new google.maps.Polyline(gr100kCoord,k100_linecolor, k100_linewidth, k100_lineopacity)
      }
      else if (this.interval == 1000) { 
         this.gridlines[j] = new google.maps.Polyline(gr100kCoord,k1_linecolor, k1_linewidth, k1_lineopacity)
      }
      else if (this.interval == 100) { 
         this.gridlines[j] = new google.maps.Polyline(gr100kCoord,m100_linecolor, m100_linewidth, m100_lineopacity)
      }
      this.map.addOverlay(this.gridlines[0])
      this.map.addOverlay(this.gridlines[j])

      // clear array that holds coordinates
      for (n=0; n<gr100kCoord.length; n++) { gr100kCoord[n] = null; };
    }

    eastings[k] = this.elng

    if (this.interval == 100000) {
       this.place100kMarkers(eastings,northings)
    }
    else if (this.interval == 1000) {
       this.place1kMarkers(eastings,northings)
    }
    else if (this.interval == 100) {
       this.place100mMarkers(eastings,northings)
    }

}  // end drawOneCell


gridcell.prototype.onRemove = function() {
   for (var i=0; i<this.gridlines.length; i++) {
      this.map.removeOverlay(this.gridlines[i]);
   }
   for (var i=0; this.marker100k[i]; i++) {
      this.map.removeOverlay(this.marker100k[i]);
   }
   for (var i=0; this.marker1k[i]; i++) {
      this.map.removeOverlay(this.marker1k[i]);
   }
}

///  implementation of Cohen-Sutherland clipping algorithm to clip grid lines at boundarie
//        of utm zones and the viewport edges

gridcell.prototype.checkClip = function(cp, p) {
   var temp
   var t
   var u1=cp[p].lng()
   var v1=cp[p].lat()
   var u2=cp[p+1].lng()
   var v2=cp[p+1].lat()
   var code1 = this.outcode(v1, u1)
   var code2 = this.outcode(v2, u2)
   if ((code1 & code2) != 0) {   // line segment outside window...don't draw it
      return null
   }
   if ((code1 | code2) == 0) {   // line segment completely inside window...draw it
      return 1
   }
   if (this.inside(v1,u1)) {  // coordinates must be altered
      // swap coordinates
      temp = u1
      u1 = u2
      u2 = temp
      temp = v1
      v1 = v2
      v2 = temp
      temp = code1
      code1 = code2
      code2 = temp
   }
   if (code1 & 8) { // clip along northern edge of polygon
      t = (this.nlat - v1)/(v2-v1)
      u1 += t*(u2-u1)
      v1 = this.nlat
      cp[p] = new google.maps.LatLng(v1,u1)
   }
   else if (code1 & 4) { // clip along southern edge
      t = (this.slat - v1)/(v2-v1)
      u1 += t*(u2-u1)
      v1 = this.slat
      cp[p] = new google.maps.LatLng(v1,u1)
   }
   else if (code1 & 1) { // clip along west edge
      t = (this.wlng - u1)/(u2-u1)
      v1 += t*(v2-v1)
      u1 = this.wlng
      cp[p] = new google.maps.LatLng(v1,u1)
   }
   else if (code1 & 2) { // clip along east edge
      t = (this.elng - u1)/(u2-u1)
      v1 += t*(v2-v1)
      u1 = this.elng
      cp[p] = new google.maps.LatLng(v1,u1)
   }
 
   return 1
}

gridcell.prototype.outcode = function(lat,lng) {
   var code = 0
   if (lat < this.slat) { code |= 4 }
   if (lat > this.nlat) { code |= 8 }
   if (lng < this.wlng) { code |= 1 }
   if (lng > this.elng) { code |= 2 }
   return code
}

gridcell.prototype.inside = function(lat,lng) {
   if (lat < this.slat || lat > this.nlat) {
      return 0
   }
   if (lng < this.wlng || lng > this.elng) {
      return 0
   }
   return 1
}
//////////////////////////////////////////////////////////////////////////////////////////

gridcell.prototype.place100kMarkers = function(east,north) {
   var k=0
   var zone
   var z

   for (var i=0; east[i+1]; i++) {
      for (var j=0; north[j+1]; j++) {
           // labeled marker
          zone = getZoneNumber((north[j]+north[j+1])/2,(east[i]+east[i+1])/2 )
          var z = LLtoUSNG((north[j]+north[j+1])/2,(east[i]+east[i+1])/2,1)
	  if (this.map.getZoom() > 15) {
	      return // don't display labeled marker
	  }
          else if (this.map.getZoom() < 10) {
             if (zone > 9) {
                 z = z.substring(4,6)
             }
             else {
                 z = z.substring(3,5)
             }
             opts = { 
                "icon": icon100k_1,
                "clickable": false,
                "labelText": z,
                "labelOffset": new GSize(-15, -11)
             };
          }
          else {
             if (zone > 9) {
                 z = z.substring(0,3) + z.substring(4,6)
             }
             else {
                 z = z.substring(0,2) + z.substring(3,5)
             }
             opts = { 
                "icon": icon100k_2,
                "clickable": false,
                "labelText": z,
                "labelOffset": new GSize(-15, -11)
             };
          }
          this.marker100k[k] = new LabeledMarker(new google.maps.LatLng((north[j]+north[j+1])/2,(east[i]+east[i+1])/2),opts);

          this.map.addOverlay(this.marker100k[k])
          k++
     }
   }
}


gridcell.prototype.place1kMarkers = function(east,north) {

   var k=0
   var zone
   var z

   // at high zooms, don't label the 1k line
   if (this.map.getZoom() > 15) {
       return;
   }

   // place labels on N-S grid lines (that is, ladder labels lined up in an E-W row)

   // normal case of labeling the lines with ladder digits
   for (var i=1; east[i+1]; i++) {
      for (var j=1; j<2; j++) {
           // labeled marker
           zone = getZoneNumber((north[j]+north[j+1])/2,(east[i]+east[i+1])/2)
           z = LLtoUSNG((north[j]+north[j+1])/2,(east[i]+east[i+1])/2,3)
           if (zone > 9) {
              z = z.substring(7,9)
           }
           else {
              z = z.substring(6,8)
           }
             opts = { 
                "icon": icon1k,
                "clickable": false,
                "labelText": z,
                "labelOffset": new GSize(-8, -15)
             };
          this.marker1k[k] = new LabeledMarker(new google.maps.LatLng((north[j]+north[j+1])/2,(east[i])),opts);

          this.map.addOverlay(this.marker1k[k])
          k++
      }
   }

   // place labels on E-W grid lines (that is, ladder labels lined up in a N-S column)
   for (var i=1; i<2; i++) {
      for (var j=1; north[j+1]; j++) {
           // labeled marker
           zone = getZoneNumber((north[j]+north[j+1])/2,(east[i]+east[i+1])/2)
           var z = LLtoUSNG((north[j]+north[j+1])/2,(east[i]+east[i+1])/2,3)
           if (zone > 9) {   
               z = z.substring(11,13)
           }
           else {
               z = z.substring(10,12)
           }
             opts = { 
                "icon": icon1k,
                "clickable": false,
                "labelText": z,
                "labelOffset": new GSize(-8, -15)
             };
          this.marker1k[k] = new LabeledMarker(new google.maps.LatLng((north[j]),(east[i]+east[i+1])/2),opts);

          this.map.addOverlay(this.marker1k[k])
          k++
     }
   }
}  // end place1kMarkers()



gridcell.prototype.place100mMarkers = function(east,north) {
   var k=0
   var zone;
   var z, y;

   // place labels on N-S grid lines (that is, ladder labels lined up in an E-W row)
   for (var i=1; east[i+1]; i++) {
      for (var j=1; j<2; j++) {
           // labeled marker
           zone = getZoneNumber((north[j]+north[j+1])/2,(east[i]+east[i+1])/2)
           z = LLtoUSNG((north[j]+north[j+1])/2,(east[i]+east[i+1])/2,4);
           if (zone > 9) {
               y = z.substring(7,9)
	       z = z.substring(9,10)
           }
           else {
               y = z.substring(6,8)
	       z = z.substring(8,9)
           }
             opts = { 
                "icon": icon100m,
                "clickable": false,
                "labelText": y+"<sup>"+z+"</sup>",
                "labelOffset": new GSize(-9, -8)
             };
          this.marker1k[k] = new LabeledMarker(new google.maps.LatLng((north[j]+north[j+1])/2,(east[i])),opts);

          this.map.addOverlay(this.marker1k[k])
          k++
      }
   }

   // place labels on E-W grid lines (that is, ladder labels lined up in a N-S column)
   for (var i=1; i<2; i++) {
      for (var j=1; north[j+1]; j++) {
           // labeled marker
           zone = getZoneNumber((north[j]+north[j+1])/2,(east[i]+east[i+1])/2)
           var z = LLtoUSNG((north[j]+north[j+1])/2,(east[i]+east[i+1])/2,4)
           if (zone > 9) {   
               y = z.substring(12,14)
               z = z.substring(14,15)
           }
           else {
               y = z.substring(11,13)
               z = z.substring(13,14)
           }
             opts = { 
                "icon": icon100m,
                "clickable": false,
                "labelText": y+"<sup>"+z+"</sup>",
                "labelOffset": new GSize(-10, -10)
             };
          this.marker1k[k] = new LabeledMarker(new google.maps.LatLng((north[j]),(east[i]+east[i+1])/2),opts);

          this.map.addOverlay(this.marker1k[k])
          k++
     }
   }
}  // end place100mMarkers()
