import {Component, OnInit, ViewChild, AfterViewInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {FirebaseService} from '../../services/firebase.service';

/*import {AgmMap, LatLngLiteral} from '@agm/core';*/

@Component({
  selector: 'app-view-farmer',
  templateUrl: './view-farmer.component.html',
  styleUrls: ['./view-farmer.component.css']
})

export class ViewFarmerComponent implements OnInit, AfterViewInit {
  guid: any;
  farmerName = '';
  indVisits;
  groupVisits;
  platforms;
  farmerDemographics;

  // This will control whether or not the current user has edit capability on this page
  canEdit = true;

  // Used for displaying the farm on a map
  farmInformation = false;
  farmLocationDate;
  mapCenter;
  farmCorners = [];
  @ViewChild('farmMap') agmMap: google.maps.Map;
  hasLocation = false;
  mapReady = false;

  // Used for displaying the Farm/Yield information
  hasYields = false;
  hasFarmInformation = false;
  yieldArray = [];
  topicArray = [];
  conditions = 'Information Not Collected or Not Available';
  finances = 'Not Collected';
  topography = 'Information Not Collected or Not Available';
  @ViewChild('landCoverInput') landCoverSelect;
  landCover;
  landCoverOptions = ['Mostly arable', 'Partially wooded', 'Mostly wooded', 'Fallow', 'Drought prone', 'Flood prone'];
  aquaculture;
  largeRuminants;
  smallRuminants;
  poultry;


  constructor(private route: ActivatedRoute, private firebaseService: FirebaseService) {
  }

  ngOnInit() {
    this.guid = this.route.snapshot.params['id'];
    this.indVisits = [];
    this.groupVisits = [];
    this.platforms = [];

    this.getIndividualVisits().then(visits => {
      this.indVisits = visits;
      // Set the farmer's name
      if (visits && visits.length > 0) {
        // Try to get the farmer's name from the farm visit
        this.farmerName = visits[0].farmerInformation.name;
      } else {
        // If we can get it from a farm visit, get the name from the contact object
        this.firebaseService.getContactByGuid(this.guid).then((contact: any) => {
          this.farmerName = contact.contactName;
        });
      }

      // Let's sort the visits chronologically, with the most recent visits first
      const sortedVisits = visits.sort(function (a, b) {
        return a.visitInformation.visitDate > b.visitInformation.visitDate;
      });

      this.loadFarmInformation(sortedVisits);
    });

    this.getGroupVisits().then(gVisits => {
      // Let's sort the visits chronologically, with the most recent visits first
      gVisits.sort(function (a, b) {
        return a.visitInformation.visitDate > b.visitInformation.visitDate;
      });

      this.groupVisits = gVisits;
      this.loadGroupVisits(gVisits);
    });

    this.getPlatforms().then(plat => {
      this.platforms = plat;
      this.loadPlatformInfo(this.platforms);
    });
  }

  ngAfterViewInit() {
    this.updateLandCoverSelect();
  }

  getIndividualVisits(): Promise<any> {
    return new Promise(resolve => {
      const individualVisitList = [];

      this.firebaseService.getAllIndividualFarmVisits().subscribe(individualVisits => {
        if (individualVisits && individualVisits.length > 0) {
          for (let i = 0; i < individualVisits.length; i++) {
            if (individualVisits[i].farmerInformation.guid === this.guid) {
              individualVisitList.push(individualVisits[i]);
              this.farmerDemographics = individualVisits[i].farmerInformation;
            }
          }

          resolve(individualVisitList);
        }
      });
    });
  }

  farmMapResize() {
    if (this.agmMap) {
      google.maps.event.trigger(this.agmMap, 'resize');
    }
  }

  mapLoaded() {
    this.mapReady = true;
  }

  getGroupVisits(): Promise<any> {
    return new Promise(resolve => {
      const visits = [];

      this.firebaseService.getAllGroupFarmVisits().subscribe(groupVisits => {
        if (groupVisits && groupVisits.length) {
          for (let i = 0; i < groupVisits.length; i++) {
            const visit = groupVisits[i];
            if (visit.attendees && visit.attendees.length && visit.attendees.length > 0) {
              for (let k = 0; k < visit.attendees.length; k++) {
                // check the guid first
                if (visit.attendees[k].guid && visit.attendees[k].guid === this.guid) {
                  visits.push(visit);
                }
              }
            }
          }
          resolve(visits);
        }
      });
    });
  }

  getPlatforms(): Promise<any> {
    return new Promise(resolve => {
      resolve(this.firebaseService.getPlatformsForFarmer(this.guid));
    });
  }

  getId(plat) {
    return 'modal' + this.platforms.indexOf(plat).toString();
  }

  getSubcats(sopChecklist) {
    let sop = sopChecklist;
    if (sop && sop.length > 1 && sop[0].category) {
      return sop.splice(0, 1);
    }
  }

  loadPlatformInfo(platforms) {
    //
  }

  loadGroupVisits(visitList) {

  }

  loadFarmInformation(visitList) {
    if (visitList && visitList.length > 0) {
      this.farmInformation = true;

      for (let i = 0; i < visitList.length; i++) {

        // Load the topics discussed
        if (this.topicArray.length === 0) {
          this.topicArray = visitList[i].visitInformation.visitFocus;
        }

        if (!this.hasLocation && visitList[i].farmLocation) {
          // Check to see that we haven't loaded the farm's location yet.
          // If not, and we have a location available, let's show it on a map

          const loc = visitList[i].farmLocation;
          this.hasLocation = true;

          // 12-13-17 updating the way that farm corners are mapped, using an if-else to handle both the old method and new
          if (loc.pointOneLat) {
            this.mapCenter = loc.pointOneLat + ', ' + loc.pointOneLong;

            this.farmCorners.push({
              lat: loc.pointOneLat,
              lng: loc.pointOneLong
            });
            this.farmCorners.push({
              lat: loc.pointTwoLat,
              lng: loc.pointTwoLong
            });
            this.farmCorners.push({
              lat: loc.pointThreeLat,
              lng: loc.pointThreeLong
            });
            this.farmCorners.push({
              lat: loc.pointFourLat,
              lng: loc.pointFourLong
            });
          } else if (loc.length) {

            // Swap the first and last two points to prevent the "chopped" look
            let first = loc[0];
            let second = loc[1];
            loc[0] = loc[loc.length - 1];
            loc[1] = loc[loc.length - 2];
            loc.push(first);
            loc.push(second);

            // Smooth the points using splines
            let smoothedPoints = this.smoothPoints(loc);

            this.farmCorners = this.farmCorners.concat(smoothedPoints);

            if (this.farmCorners.length > 0) {
              this.mapCenter = this.farmCorners[0].lat + ', ' + this.farmCorners[0].lng;
            }
          }

          this.farmLocationDate = visitList[i].visitInformation.visitDate;

        }

        if (!this.hasYields && visitList[i].farmYields) {
          // If we haven't loaded yield information yet and it's available, let's display it
          this.hasYields = true;
          const visit = visitList[i].farmYields;
          if (visit.finances !== '') {
            this.finances = visit.finances;
          }
          if (visit.conditions !== '') {
            this.conditions = visit.conditions;
          }
          this.yieldArray = visit.yields;
        }

        if (!this.hasFarmInformation && visitList[i].farmInformation) {
          this.hasFarmInformation = true;
          const info = visitList[i].farmInformation;
          if (info.topography !== '') {
            this.topography = info.topography;
          }

          /*// Since land cover comes in an array, let's make it into a pretty comma-delimited string
          if (info.landCover) {
            this.landCover = '';
            for (let k = 0; k < info.landCover.length; k++) {
              this.landCover += info.landCover[k];
              if (k !== info.landCover.length - 1) {
                this.landCover += ', ';
              }
            }
          }*/
          // Check for animals the farmer has
          this.aquaculture = visitList[i].farmInformation.aquaculture ? visitList[i].farmInformation.aquaculture : '';
          this.largeRuminants = visitList[i].farmInformation.largeRuminants ? visitList[i].farmInformation.largeRuminants : '';
          this.smallRuminants = visitList[i].farmInformation.smallRuminants ? visitList[i].farmInformation.smallRuminants : '';
          this.poultry = visitList[i].farmInformation.poultry ? visitList[i].farmInformation.poultry : '';


          this.landCover = info.landCover ? info.landCover : [];
        }


        // TODO: load farmer questions, only display it in the table if there are actually questions present

      }
    } else {
      this.farmInformation = false;
    }
  }

  changeLandCover(event) {
    for (let i in event.target.selectedOptions) {
      if (event.target.selectedOptions[i].label) {
        console.log(event.target.selectedOptions[i].label);
      }
    }
  }

  updateLandCoverSelect() {
    /*let options = this.landCoverSelect.nativeElement.options;
    for (let i = 0; i < options.length; i++) {
      options[i].selected = this.landCover.indexOf(options[i].value) > -1;
    }*/
  }

  /**
   * Helper function used to determine if a given land cover option is contained within the this.landCover array
   * @param item
   * @returns {boolean}
   */
  isSelected(item): boolean {
    if (this.landCover.indexOf(item) > -1) {
      console.log(item + 'is selected');
    }
    return this.landCover.indexOf(item) > -1;
  }

  /**
   * bspline code thanks to
   * https://johan.karlsteen.com/2011/07/30/improving-google-maps-polygons-with-b-splines/
   * @param input
   * @returns {any}
   */
  smoothPoints(input) {
    let lats = [];
    let lons = [];

    for (let i = 0; i < input.length; i++) {
      lats.push(input[i].lat);
      lons.push(input[i].lng);
    }

    let i, t, ax, ay, bx, by, cx, cy, dx, dy, lat, lon, points;
    points = [];
    // For every point
    for (i = 2; i < lats.length - 2; i++) {
      for (t = 0; t < 1; t += 0.2) {
        ax = (-lats[i - 2] + 3 * lats[i - 1] - 3 * lats[i] + lats[i + 1]) / 6;
        ay = (-lons[i - 2] + 3 * lons[i - 1] - 3 * lons[i] + lons[i + 1]) / 6;
        bx = (lats[i - 2] - 2 * lats[i - 1] + lats[i]) / 2;
        by = (lons[i - 2] - 2 * lons[i - 1] + lons[i]) / 2;
        cx = (-lats[i - 2] + lats[i]) / 2;
        cy = (-lons[i - 2] + lons[i]) / 2;
        dx = (lats[i - 2] + 4 * lats[i - 1] + lats[i]) / 6;
        dy = (lons[i - 2] + 4 * lons[i - 1] + lons[i]) / 6;
        lat = ax * Math.pow(t + 0.1, 3) + bx * Math.pow(t + 0.1, 2) + cx * (t + 0.1) + dx;
        lon = ay * Math.pow(t + 0.1, 3) + by * Math.pow(t + 0.1, 2) + cy * (t + 0.1) + dy;
        points.push({
          lat: lat,
          lng: lon
        });
      }
    }
    return points;
  }

}
