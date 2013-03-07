// ***************************************************************************
// *  gars.js
// *
// *  Copyright  2009  Larry Moore
// *  larmoor@gmail.com
// ****************************************************************************/
//
//
//   This program is free software; you can redistribute it and/or modify
//   it under the terms of the GNU General Public License as published by
//   the Free Software Foundation; either version 2 of the License, or
//   (at your option) any later version.
// 
//   This program is distributed in the hope that it will be useful,
//   but WITHOUT ANY WARRANTY; without even the implied warranty of
//   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//   GNU General Public License for more details.
// 
//   You should have received a copy of the GNU General Public License
//   along with this program.  The GPL is available at http://www.gnu.org, 
//   or by writing to the Free Software Foundation, Inc., 59 Temple Place - 
//   Suite 330, Boston, MA 02111-1307, USA.
// 
//
// This module converts lat/lng pairs to Global Area Reference System (GARS) strings.
// The code is derived from GridFinder by Scott E. Lanis (http://www.cap-es.net/Gridfinder/gridfind.html)
// but has been generalized by Larry Moore to compute values for the entire globe.  These modifications
// have not yet been thoroughly tested.
//
// See http://earth-info.nga.mil/GandG/coordsys/grids/gars.html for an explanation of GARS
//


function ConditionCoord(LatORLong) // Condition a Latitude or Longitude to the nearest 30' for GARS transformation
	{
	/* In:	Lat or Long not rounded to nearest half degree / 30 minutes (Number) */
	/* Out:	A Conditioned Lat or Long to the nearest half degree */
	var ConditionedL=0;
	ConditionedL=(Math.floor(LatORLong*2));
	ConditionedL=(ConditionedL/2);
	return ConditionedL;
	}

function getGARSletter(Ordinal) // Change an ordinal number into a GARS Latitude Reference Letter
	{
	/* In:	GARS ordinal number */
	/* Out:	GARS reference letter */
	var GARSletter=0;
	if (Ordinal == 1) { GARSletter="A"; }
	else if (Ordinal == 2) { GARSletter="B"; }
	else if (Ordinal == 3) { GARSletter="C"; }
	else if (Ordinal == 4) { GARSletter="D"; }
	else if (Ordinal == 5) { GARSletter="E"; }
	else if (Ordinal == 6) { GARSletter="F"; }
	else if (Ordinal == 7) { GARSletter="G"; }
	else if (Ordinal == 8) { GARSletter="H"; }
	else if (Ordinal == 9) { GARSletter="J"; }
	else if (Ordinal == 10) { GARSletter="K"; }
	else if (Ordinal == 11) { GARSletter="L"; }
	else if (Ordinal == 12) { GARSletter="M"; }
	else if (Ordinal == 13) { GARSletter="N"; }
	else if (Ordinal == 14) { GARSletter="P"; }
	else if (Ordinal == 15) { GARSletter="Q"; }
	else if (Ordinal == 16) { GARSletter="R"; }
	else if (Ordinal == 17) { GARSletter="S"; }
	else if (Ordinal == 18) { GARSletter="T"; }
	else if (Ordinal == 19) { GARSletter="U"; }
	else if (Ordinal == 20) { GARSletter="V"; }
	else if (Ordinal == 21) { GARSletter="W"; }
	else if (Ordinal == 22) { GARSletter="X"; }
	else if (Ordinal == 23) { GARSletter="Y"; }
	else if (Ordinal == 24) { GARSletter="Z"; }
	return GARSletter;
	}


// GARS
function LLtoGARS(LatitudeDecimal, LongitudeDecimal) {

	var ConditionedLat=0;
	var ConditionedLong=0;
	var NorthHemisphere = 1;
	var GARSy=0;
	var GARSx1=0;
	var GARSx2=0;
	var GARSxA=0;
	var GARSxB=0;
	var GARSlatremainder=0;
	var GARSlongremainder=0;
	var GARS15minutedigit=0;
	var Keypad=0;
	var KeypadRemainder=0;

   //alert(LongitudeDecimal + ", " + LatitudeDecimal);
   LongitudeDecimal *= -1;

	NorthHemisphere = 1;
	if (NorthHemisphere == 1) { ConditionedLat = ConditionCoord(LatitudeDecimal+90); }
	ConditionedLong = ConditionCoord(LongitudeDecimal);

	LongitudeDegrees=(Math.floor(LongitudeDecimal));
	LongitudeMinutes = (((LongitudeDecimal-LongitudeDegrees)*60));

	if (LongitudeMinutes == 0)
		{ GARSy = ((180-LongitudeDegrees)*2)+1; }			// Find Longitude Cell
	else if (LongitudeMinutes <= 30)
		{ GARSy = ((180-LongitudeDegrees)*2); }			// Find Longitude Cell
	else
		{ GARSy = ((180-LongitudeDegrees)*2)-1; }			// Find Longitude Cell
		
	GARSx1 = (Math.floor((ConditionedLat*2/24)+1)); 	// Find Latitude Cell 1st Letter Ordinal Number
	GARSx2 = ((ConditionedLat)*24/12)+1-((GARSx1-1)*24);	// Find Latitude Cell 2nd Letter Ordinal Number
	GARSxA = getGARSletter(GARSx1);				// Change ordinal number into GARS Cell Letter
	GARSxB = getGARSletter(GARSx2);				// Change ordinal number into GARS Cell Letter

// Determine 1-2-3-4 Quadrant

	LatitudeDegrees=(Math.floor(LatitudeDecimal));
	LatitudeMinutes = (((LatitudeDecimal-LatitudeDegrees)*60));

	if (LatitudeMinutes < 60)
		{
		if (LongitudeMinutes < 60)
			{
			GARS15minutedigit="1";
			}
		if (LongitudeMinutes <= 45)
			{
			GARS15minutedigit="2";
			}
		if (LongitudeMinutes <= 30)
			{
			GARS15minutedigit="1";
			}
		if (LongitudeMinutes <= 15)
			{
			GARS15minutedigit="2";
			}
		if (LongitudeMinutes == 0)
			{
			GARS15minutedigit="1";
			}
		}

	if (LatitudeMinutes < 45)
		{
		if (LongitudeMinutes < 60)
			{
			GARS15minutedigit="3";
			}
		if (LongitudeMinutes <= 45)
			{
			GARS15minutedigit="4";
			}
		if (LongitudeMinutes <= 30)
			{
			GARS15minutedigit="3";
			}
		if (LongitudeMinutes <= 15)
			{
			GARS15minutedigit="4";
			}
		if (LongitudeMinutes == 0)
			{
			GARS15minutedigit="3";
			}
		}

	if (LatitudeMinutes < 30)
		{
		if (LongitudeMinutes < 60)
			{
			GARS15minutedigit="1";
			}
		if (LongitudeMinutes <= 45)
			{
			GARS15minutedigit="2";
			}
		if (LongitudeMinutes <= 30)
			{
			GARS15minutedigit="1";
			}
		if (LongitudeMinutes <= 15)
			{
			GARS15minutedigit="2";
			}
		if (LongitudeMinutes == 0)
			{
			GARS15minutedigit="1";
			}
		}

	if (LatitudeMinutes < 15)
		{
		if (LongitudeMinutes < 60)
			{
			GARS15minutedigit="3";
			}
		if (LongitudeMinutes <= 45)
			{
			GARS15minutedigit="4";
			}
		if (LongitudeMinutes <= 30)
			{
			GARS15minutedigit="3";
			}
		if (LongitudeMinutes <= 15)
			{
			GARS15minutedigit="4";
			}
		if (LongitudeMinutes == 0)
			{
			GARS15minutedigit="3";
			}
		}

/*  Erics Replacement for the Keypad Selection routine */

// Determine Keypad Number
	KeypadRemainder = LongitudeMinutes;

	if (LongitudeMinutes >= 30)
		{
		KeypadRemainder = LongitudeMinutes - 30;
		}	

	GARSlatremainder = LatitudeMinutes;

	if (LatitudeMinutes >= 30)
		GARSlatremainder = LatitudeMinutes - 30;


	if (GARSlatremainder < 30)
			{
			if (KeypadRemainder < 30) (Keypad=1);	
			if (KeypadRemainder < 25) (Keypad=2);	
			if (KeypadRemainder < 20) (Keypad=3);	
			if (KeypadRemainder < 15) (Keypad=1);	
			if (KeypadRemainder < 10) (Keypad=2);	
			if (KeypadRemainder < 5)  (Keypad=3);	
			if (KeypadRemainder == 0)  (Keypad=1);	
			}
	if (GARSlatremainder < 25)
			{
			if (KeypadRemainder < 30) (Keypad=4);
			if (KeypadRemainder < 25) (Keypad=5);	
			if (KeypadRemainder < 20) (Keypad=6);	
			if (KeypadRemainder < 15) (Keypad=4);	
			if (KeypadRemainder < 10) (Keypad=5);	
			if (KeypadRemainder < 5) (Keypad=6);	
			if (KeypadRemainder == 0)  (Keypad=4);	
			}
	if (GARSlatremainder < 20)
			{
			if (KeypadRemainder < 30) (Keypad=7);	
			if (KeypadRemainder < 25) (Keypad=8);	
			if (KeypadRemainder < 20) (Keypad=9);	
			if (KeypadRemainder < 15) (Keypad=7);	
			if (KeypadRemainder < 10) (Keypad=8);	
			if (KeypadRemainder < 5)  (Keypad=9);	
			if (KeypadRemainder == 0)  (Keypad=7);	
			}
	if (GARSlatremainder < 15)
			{	
			if (KeypadRemainder < 30) (Keypad=1);
			if (KeypadRemainder < 25) (Keypad=2);	
			if (KeypadRemainder < 20) (Keypad=3);	
			if (KeypadRemainder < 15) (Keypad=1);	
			if (KeypadRemainder < 10) (Keypad=2);	
			if (KeypadRemainder < 5)  (Keypad=3);	
			if (KeypadRemainder == 0)  (Keypad=1);	
			}
	if (GARSlatremainder < 10)
			{
			if (KeypadRemainder < 30) (Keypad=4);
			if (KeypadRemainder < 25) (Keypad=5);	
			if (KeypadRemainder < 20) (Keypad=6);	
			if (KeypadRemainder < 15) (Keypad=4);	
			if (KeypadRemainder < 10) (Keypad=5);	
			if (KeypadRemainder < 5) (Keypad=6);	
			if (KeypadRemainder == 0)  (Keypad=4);	
			}
	if (GARSlatremainder < 5) 
			{ 
			if (KeypadRemainder < 30) (Keypad=7);
			if (KeypadRemainder < 25) (Keypad=8);	
			if (KeypadRemainder < 20) (Keypad=9);	
			if (KeypadRemainder < 15) (Keypad=7);	
			if (KeypadRemainder < 10) (Keypad=8);	
			if (KeypadRemainder < 5)  (Keypad=9);	
			if (KeypadRemainder == 0)  (Keypad=7);	
			}
			
	if (GARSy < 10) {
		return('00' + GARSy + GARSxA + GARSxB + GARS15minutedigit + Keypad)
	}
	else if (GARSy < 100) {
		return('0' + GARSy + GARSxA + GARSxB + GARS15minutedigit + Keypad)
	}
	else {
		return(GARSy + GARSxA + GARSxB + GARS15minutedigit + Keypad)
	}
	    
}  // end function LLtoGARS


