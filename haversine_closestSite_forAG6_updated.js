/*
Example use of the haversine formula and new claim.system.geoIp.latitude and claim.system.geoIp.longitude
to deturmine Closest Site for a users Core Services connection using claim driven deployment site Policy level option in Appgate SDP
This script is to be used as a User Claim Script in Appgate SDP and will return an element to the
agScripted user claim agScripted.closestSite that is the GUID of the Appgate Site closest to the user

To use the attached script to set the users Entitled "Core Services" traffic to flow through the Appgate SDP Site closest to
their currant location follow the instructions below:
 1. Modify the variable "sites" at the top of this script to include an array element with the "name", "id", "loc", and "ip"
    for each site you want to be considered in the closestSite calculation for users logging into Appgate SDP
 2. Upload the modified script "haversine_closestSite_6.0.js" to the Appgate SDP Collective "Identity-->User Claim Scripts"
 3. Add the User Claim Script "haversine_closestSite_6.0.js" to the IDP your users will log into.
    "Identity-->Identity Providers-->(your_users_IDP)-->User Claim Scripts"
 4. Create or modify the Policy for your Core Services that need users to connect to the closest site to use and set the
    "Deployment Site" option to "Override Site using Claim" claim.user.agScripted.closestSite
*/

/* Set Default closestSite to AWNC in case script fails to find one */
let closestSiteId = "b0ae99ab-99a2-4627-92ee-4776e3e7e9c0";
let closestSiteName = "AWNC";

/* { name: "<Appgate Site Name>", id: "<Appgate Site GUID>", lat:"<latitude>", lon: "<longitude>", ip: "<Public IP of SNAT for all Internet traffic at the AG Site>" }" */
const sites = [
  { name: "AWCA", id: "da081fd3-6a76-488a-ba05-69425b7b4368", lat: "55.585901", lon: "-105.750596", ip: "1.2.3.4" },
  { name: "AWIR", id: "ac5878b5-113c-426d-a44d-94a4fe213fe8", lat: "53.305494", lon: "7.737649", ip: "5.6.7.8" },
  { name: "AWLO", id: "b8ba5af0-27f9-4bed-89cd-d6e6400f1819", lat: "51.50722", lon: "-0.1275", ip: "9.10.11.12" },
  { name: "AWNV", id: "5e855ce4-6353-423c-9f1e-47f2c52d565b", lat: "38.00234", lon: "-78.224935", ip: "13.14.15.16" },
  { name: "AWNC", id: "b0ae99ab-99a2-4627-92ee-4776e3e7e9c0", lat: "32.71571", lon: "-117.16472", ip: "17.18.19.20" }
];

/* Determine if the Users clientSrcIP System Claim is equal to the Pulbic SNAT IP of one of the Appgate Sites. "Is the User located at one of the Appgate Gateway Sites?" */
for (let site of sites) {
  if (site.ip == claims.system.clientSrcIP) {
    console.log("Site SNAT IP matches Client SNAT IP, Setting Site to ID: " + site.name + " Name: " + site.id);
    return { closestSite: site.id };
  }
}

if (!claims.system.geoIp || !claims.system.geoIp.latitude || !claims.system.geoIp.longitude) {
  console.log("GeoIP info not found. returning Default Site: " + closestSiteName);
  return { closestSite: closestSiteId };
}

/* (mean) radius of Earth (6371000 meters) */
const R = 6371000;

function squared(x) { return x * x }
function toRad(x) { return x * Math.PI / 180.0 }
function haversineDistance(a, b) {
  const aLat = a.latitude || a.lat;
  const bLat = b.latitude || b.lat;
  const aLng = a.longitude || a.lng || a.lon;
  const bLng = b.longitude || b.lng || b.lon;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLng - aLng);
  const f = squared(Math.sin(dLat / 2.0)) + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * squared(Math.sin(dLon / 2.0));
  const c = 2 * Math.atan2(Math.sqrt(f), Math.sqrt(1 - f));

  return Math.round(R * c / 1000);
}

const clientLat = claims.system.geoIp.latitude;
const clientLon = claims.system.geoIp.longitude;

let prevDistance = 1E9;
for (let site of sites) {
  const clientToSite = haversineDistance({ "lat": clientLat, "lon": clientLon }, { "lat": site.lat, "lon": site.lon });
  console.log("Distance to " + site.name + " is " + clientToSite + " <-> ");
  if (clientToSite < prevDistance) {
    closestSiteId = site.id;
    closestSiteName = site.name;
    prevDistance = clientToSite;
  }
}

console.log(" ** Closest AG Site is being set to: " + closestSiteName + " ** ");
return { closestSite: closestSiteId };
