# Pogo-Tools
Mark Pokestops and Gyms in Pokemon Go using IITC for [Ingress Intel](https://ingress.com/intel) with your Ingress account. Render two layers of s2 cell grid. Mark pogo-only locations. A fork of [AlfonsoML's Pogo-Tools](https://gitlab.com/AlfonsoML/pogo-s2/) (which no longer exists because wayfarer isn't healthy for you - please, turn back now), for [IITC-CE](https://iitc.app/) with the PoGOHWH changes, making rendering large numbers of pokethings possible, while removing some of the charm.

## Pre-requisites
  1. An Ingress account. Optionally, you can get 40 more nominations if you get to level 10 as Enlightened.
  2. Verify that you can login in https://intel.ingress.com
  3.
* For PC, install [Tampermonkey](https://tampermonkey.net/) on your browser of choice. Then install  [IITC-CE](https://iitc.app/build/release/total-conversion-build.user.js).
* For Android install [IITC-CE](https://f-droid.org/packages/org.exarhteam.iitc_mobile/) using F-Droid
* For iOS install [IITC-Mobile](https://testflight.apple.com/join/UOHpFy01) using TestFlight
4. Reload https://intel.ingress.com (or open the mobile app) and check that it works. You can enable the Google Satellite view to switch to a map easier to understand. You can also install and enable the "OpenStreetMap.org map tiles" plugin ([Destkop install](https://iitc.app/build/release/plugins/basemap-openstreetmap.user.js), in Mobile they come pre-installed).
 
## Install
### Desktop
<a href='https://gitlab.com/NvlblNm/pogo-s2/raw/master/s2check.user.js?inline=false'>Click on this link</a>, now your browser should open a new tab with Tampermonkey asking for confirmation of the Install.   
<img src="https://gitlab.com/NvlblNm/pogo-s2/raw/master/assets/tampermonkey_install.png">  
Click the Install button and load again the Ingress Intel page. 

### Android
<a href='https://gitlab.com/NvlblNm/pogo-s2/raw/master/s2check.user.js?inline=false'>Click on this link</a>, and you might be prompted to open in IITCm (accept it if you have this option), or the file might be downloaded automatically (as either s2check.user.js or s2check.txt).
If the file has been downloaded, then open IITCm, go to Settings->Plugins and click the 3 dots menu to add a plugin and select the file that you have downloaded.   

Then you'll get the install prompt  
<img src="https://gitlab.com/NvlblNm/pogo-s2/raw/master/assets/install_prompt.jpg">  
After successfully installing the plugin, it will be available under User Plugins->Layer and you have to enable it (click the checkbox)  
<img src="https://gitlab.com/NvlblNm/pogo-s2/raw/master/assets/enable_plugin.jpg">  

### iOS
In iOS:
- Click the settings icon in the upper right
- Click IITC Plugins
- Click User Scripts
- Click +
- Paste [this url](https://gitlab.com/NvlblNm/pogo-s2/raw/master/s2check.user.js)
- Search the plugin list for "Pogo" and enable it.

## Features
In IITC there are two links added to the side pane, one shows the actions available with the Pokemon data and the other allows you to change the settings of the plugin.
 
Settings dialog:
  1. Draw an overlay of two S2 cells levels (usually 14 for gyms and 17 for pokethings)
  2. Cover the level 17 cells where there is already a pokestop or gym, and if the L14 cell has already 3 gyms then it fills all of it with a dark color. In the center of the L14 cells will show the number of portals that must be added to that cell to get a new Gym. Also, draw a 20m circle around existing portals where no new portal will get approved. "Highlight Cells that might get a Gym" setting.
  3. Ability to check for updated data and suggest the addition of new Pokestops or Gyms when new Portals are detected, as well as movements or removals or portals. "Analyze portal data" setting
  4. Disable most of the features of Intel that aren't relevant to Pokemon (fields, links, portal ownership, chat...) with the "This is PoGo!" setting
  5. Configurable colors
  
Actions dialog
  1. Export all the portals and gyms data in JSON.
  2. Export the gyms and pokestops data as CSV to use it in any place where they expect that format (Overpass turbo, import to Google sheet for raid bots, ...)
  3. Reset all the data. In case something goes wrong (maybe incompatibility with another Pokemon Go plugin) test by clicking this option and reloading intel. If you have other IITC plugins for PoGo you should try to disable them if there are problems, this plugin includes everything that it's needed.  
  4. Import/Export the whole data for backups or to use in anothe device


Coloring of cells.  
When the Highlight cells that might get a Gym is selected, the L17 cells will be covered with a dark pattern, and L14 cells that have 3 gyms will be also darker so you can focus your efforts in other locations when requesting new portals.  
If a cell has enough portals but you have forgot to mark one of the stops as gyms the L14 cell will be marked as orange and in case that there are more gyms than expected then it will be red.
 
Adding Pokestops/Gyms  
When you select a portal, in the sidebar there will be two little icons of a pokeball and a gym so you can mark this portal as a Pokestop or Gym.  

**Analyze portal data**
If this setting is enabled, the plugin will try detect changes in the existing portals and so it will show some messages ("New pokestops X", "Review required X", "Moved portals X", ...) and clicking on those numbers will display a dialog trying to explain the detected changes. Hovering on the photos or locations will display a blinking marker on the map, clicking on them will center the map on them (and they might end up below the dialog, so move it afterwards to check the location)

## Adding pokethings not in Ingress
Pogo-Tools comes with a lightweight method for marking pokestops and gyms which are not portals. Click the pokestop icon in the upper left, then click anywhere on the map to add a new pokething, optionally with a photo.

## Adding your candidates
If you want to add your candidates to the map to easily keep track of them, use the [Wayfarer Planner](https://gitlab.com/NvlblNm/wayfarer/) plugin.

