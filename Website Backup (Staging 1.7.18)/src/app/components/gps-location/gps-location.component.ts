import {Component, ElementRef, OnInit, Renderer2, ViewChild} from '@angular/core';
import {FirebaseService} from '../../services/firebase.service';
import {Router, ActivatedRoute, Params} from '@angular/router';
import {HeatmapLayer} from '@ngui/map';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/forkJoin';
import {FlashMessagesService} from 'angular2-flash-messages';

@Component({
  selector: 'app-gps-location',
  templateUrl: './gps-location.component.html',
  styleUrls: ['./gps-location.component.css']
})

export class GpsLocationComponent implements OnInit {

  id: any;
  email: any;
  fullName: string;
  district: string;
  area: string;
  managerList = []; // Used to store an array of eligible managers
  currentManager;   // The extension worker's current manager

  groupFarmVisits: any;

  // Manage permissions
  canManageWorker = true; // TODO: get proper permissions, then default this to false

  // Activity Totals
  individualVisitCount = 0;
  groupVisitCount = 0;
  platformCount = 0;

  // Monthly totals and Goals
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  individualCountMonth = 0;
  individualVisitGoal = 10;
  groupCountMonth = 0;
  groupVisitGoal = 10;
  platformCountMonth = 0;
  platformGoal = 2;

  hasIndividualVisits = false;
  hasHeatmapLocations = false;
  hasGroupVisits = false;
  hasPlatforms = false;

  // Used to expand/collapse all tabs together for use in printing reports
  expanded = false;
  @ViewChild('collapseOne') collapseOne;
  @ViewChild('collapseTwo') collapseTwo;
  @ViewChild('collapseThree') collapseThree;
  @ViewChild('collapseFour') collapseFour;
  @ViewChild('collapseFive') collapseFive;
  @ViewChild('collapseSix') collapseSix;

  // Used for displaying the maps
  @ViewChild('individualFarmVisitMap') individualFarmMap: google.maps.Map;
  @ViewChild('groupFarmVisitMap') groupFarmMap: google.maps.Map;
  @ViewChild('locationTrackingMap') locationTrackingMap: google.maps.Map;
  @ViewChild('platformMap') platformMap: google.maps.Map;
  @ViewChild(HeatmapLayer) heatmapLayer: HeatmapLayer;
  heatmap: google.maps.visualization.HeatmapLayer;

  // Variables to store the extension worker's activities
  individualFarmVisits = [];
  individualVisitList = [];
  groupVisitList = [];
  platformList = [];
  platformPoints = [];

  locationTrackingCount = 0;
  filteredLocationCount = 0;
  heatmapData = [];   // The user tracking LatLng's
  heatmapUnfiltered = [];   // The complete list of user tracking locations and dates, used for filtering the heatmap display
  locationFilterString = 'All';

  individualMapCenter;  // Where the individual farm visit map will be centered
  heatmapCenter;        // Where the heatmap will be centered
  groupMapCenter;       // Where the group farm visit map will be centered
  platformMapCenter;

  individualMapLoaded = false;
  groupMapLoaded = false;
  locationMapLoaded = false;
  platformMapLoaded = false;

  userObject;
  extensionWorker;

  // These variables will be used for charting the extension worker's activity over the current calendar year
  activityChart = [];        // The chart JSON object we'll pass to ngx-charts
  colorScheme = {
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA']
  };
  view: any[] = [500, 200];
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = true;
  showXAxisLabel = true;
  xAxisLabel = 'Activity for ' + this.currentYear;
  showYAxisLabel = true;
  yAxisLabel = 'Number of Activities';
  autoScale = true;

  constructor(private firebaseService: FirebaseService,
              private router: Router,
              private route: ActivatedRoute,
              private flash: FlashMessagesService,
              private rd: Renderer2) {
  }

  ngOnInit() {
    this.id = this.route.snapshot.params['id'];
    this.email = this.route.snapshot.params['email'];

    // Load the extension worker's location tracking data
    this.firebaseService.getExtensionWorkerLocations(this.id).subscribe(list => {
      this.loadLocationTracking(list);
    });

    // Load the extension worker's User table object
    this.userObject = this.firebaseService.getUserObject(this.id);

    this.userObject.subscribe(details => {
      this.setExtensionWorker(details);
    });

    // Get all the possible managers, in case the user is to be assigned a new manager
    this.firebaseService.getManagers().subscribe(manager => {
      // The firebase call will return all users with role 'manager', but we also need to ensure that the user is approved
      for (let i = 0; i < manager.length; i++) {
        if (manager[i].status.toLowerCase() === 'approved') {
          this.managerList.push(manager[i]);
        }
      }
    });

    // Initialize the location tracking heatmap
    this.heatmapLayer['initialized$'].subscribe(heatmap => {
      this.heatmap = heatmap;
      this.locationTrackingMap = this.heatmap.getMap();
    });

    // Load the extension worker's individual farm visits
    let promise1 = this.getIndividualVisits().then(visits => {
      this.loadIndividualFarmVisits(visits);
    });
    // Load the extension worker's group farm visits
    let promise2 = this.getGroupVisits().then(visits => {
      this.loadGroupFarmVisits(visits);
    });
    // Load the stakeholder platforms in which the extension worker has participated
    let promise3 = this.getPlatforms().then(plats => {
      this.loadPlatforms(plats);
    });

    /**
     * Using a forkJoin to ensure that all of our FireBase data has returned before we try to build the chart
     * If we don't use a forkJoin we'll have a race condition and we'll be trying to load a chart with no actual data yet
     */
    Observable.forkJoin([promise1, promise2, promise3]).subscribe(promisesDone => {
      this.loadChart();
    });
  }

  getIndividualVisits(): Promise<any> {
    return new Promise(resolve => {
      this.firebaseService.getIndividualFarmVisitLocation(this.email).subscribe(visits => {
        resolve(visits);
      });
    });
  }

  getGroupVisits(): Promise<any> {
    return new Promise(resolve => {
      this.firebaseService.getGroupFarmVisits(this.email).subscribe(visits => {
        resolve(visits);
      });
    });
  }

  getPlatforms(): Promise<any> {
    return new Promise(resolve => {
      this.firebaseService.getMeetingDetails(this.id).subscribe(plats => {
        resolve(plats);
      });
    });
  }

  loadChart() {
    let indivChartObj = {};
    let groupChartObj = {};
    let platformChartObj = {};

    // Build out the objects for the current year, up to and including the present month
    for (let i = 0; i <= this.currentMonth; i++) {
      indivChartObj[i] = 0;
      groupChartObj[i] = 0;
      platformChartObj[i] = 0;
    }
    // Initialize the individual visits
    for (let i = 0; i < this.individualFarmVisits.length; i++) {
      let visitDate = new Date(this.individualFarmVisits[i].visitInformation.visitDate);
      if (visitDate.getFullYear() === this.currentYear) {
        let month = visitDate.getMonth();
        indivChartObj[month]++;
      }
    }
    // Initialize the group visits
    for (let i = 0; i < this.groupFarmVisits.length; i++) {
      let visitDate = new Date(this.groupFarmVisits[i].visitInformation.visitDate);
      if (visitDate.getFullYear() === this.currentYear) {
        let month = visitDate.getMonth();
        groupChartObj[month]++;
      }
    }
    // Initialize the platforms
    for (let i = 0; i < this.platformList.length; i++) {
      let visitDate = new Date(this.platformList[i].meetingDate);
      if (visitDate.getFullYear() === this.currentYear) {
        let month = visitDate.getMonth();
        platformChartObj[month]++;
      }
    }
    let tempChart = [];
    let tempIndivSeries = [];
    let tempGroupSeries = [];
    let tempPlatformSeries = [];
    let monthArray = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Now build the JSON object for each visit type
    Object.keys(indivChartObj).forEach(function (key) {
      tempIndivSeries.push({
        'name': monthArray[key],
        'value': indivChartObj[key]
      });
    });
    tempChart.push({
      'name': 'Individual Farm Visits',
      'series': tempIndivSeries
    });

    // Build out the group visits
    Object.keys(groupChartObj).forEach(function (key) {
      tempGroupSeries.push({
        'name': monthArray[key],
        'value': groupChartObj[key]
      });
    });
    tempChart.push({
      'name': 'Group Farm Visits',
      'series': tempGroupSeries
    });

    // Build out the stakeholder platforms
    Object.keys(platformChartObj).forEach(function (key) {
      tempPlatformSeries.push({
        'name': monthArray[key],
        'value': platformChartObj[key]
      });
    });
    tempChart.push({
      'name': 'Stakeholder Platforms',
      'series': tempPlatformSeries
    });

    // Set the chart object
    this.activityChart = tempChart;
  }

  setExtensionWorker(details) {
    this.extensionWorker = details;

    this.currentManager = this.extensionWorker.manager || '';
    this.district = this.extensionWorker.district || '';
    this.area = this.extensionWorker.area || '';
    this.fullName = this.extensionWorker.fullName || '';

    // Let's make sure that the extension worker has goals, otherwise use defaults
    this.individualVisitGoal = this.extensionWorker.individualGoal || this.individualVisitGoal;
    this.groupVisitGoal = this.extensionWorker.groupGoal || this.groupVisitGoal;
    this.platformGoal = this.extensionWorker.platformGoal || this.platformGoal;
  }

  loadPlatforms(platforms) {
    this.platformList = platforms;
    this.platformCount = platforms.length;

    for (let i = 0; i < platforms.length; i++) {
      // Figure out if the platform occurred this month
      let visitDate = new Date(platforms[i].meetingDate);
      if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
        this.platformCountMonth++;
      }

      if (platforms[i].minuteImage) {
        // Get the platform minutes attachment, if it exists
        this.firebaseService.getPlatformMinutesAttachment(platforms[i].$key).then(url => {
          if (url) {
            this.platformList[i].minutesUrl = url;
          }
        }).catch(err => {
          //
        });
      }

      if (platforms[i].attendeeListImage) {
        // Get the platform attendee list attachment, if it exists
        this.firebaseService.getPlatformAttendeeListAttachment(platforms[i].$key).then(url => {
          if (url) {
            this.platformList[i].attendeeList = url;
          }
        }).catch(err => {
          //
        });
      }


      // Put the platform onto the map
      if (platforms[i].villageGPSLat) {
        this.hasPlatforms = true;

        let location = new google.maps.LatLng(platforms[i].villageGPSLat, platforms[i].villageGPSLong);

        // Set the platform map center point, if it hasn't been set yet
        if (!this.platformMapCenter) {
          this.platformMapCenter = location;
        }

        this.platformPoints.push({
          location: location,
          title: this.buildPlatformTitle(platforms[i])
        });

      }
    }
  }

  loadGroupFarmVisits(visitList) {
    this.groupFarmVisits = visitList;
    this.groupVisitCount = visitList.length;

    if (visitList && visitList.length > 0) {
      this.hasGroupVisits = true;

      for (let i = 0; i < visitList.length; i++) {

        // Figure out if the visit happened this month
        let visitDate = new Date(visitList[i].visitInformation.visitDate);
        if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
          this.groupCountMonth++;
        }

        if (visitList[i].groupDetails.villageLocation) {

          // If we haven't centered the group map yet, let's do so now
          if (!this.groupMapCenter) {
            this.groupMapCenter = visitList[i].groupDetails.villageLocation;
          }

          this.groupVisitList.push({
            location: visitList[i].groupDetails.villageLocation,
            info: this.buildGroupTitle(visitList[i])
          });
        } else {
          // TODO: The group's village wasn't saved somehow, let's display an error
        }
      }
    }
  }

  loadIndividualFarmVisits(visitList) {
    if (visitList && visitList.length > 0) {
      this.hasIndividualVisits = true;
      this.individualFarmVisits = visitList;
      this.individualVisitCount = visitList.length;

      // Add a marker for each individual farm visit
      for (let i = 0; i < visitList.length; i++) {

        // Figure out if the visit happened this month
        let visitDate = new Date(visitList[i].visitInformation.visitDate);
        if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
          this.individualCountMonth++;
        }

        // Add from the farm corners if possible, otherwise use farmer's village gps coordinates
        if (visitList[i].farmLocation) {
          const loc = visitList[i].farmLocation;

          /**
           * 12/14/17: Added a check for pointOneLat vs. loc.length due to changing the way that farm corners are stored
           * Moved from dropping 4 pins (points one-four) to dropping an array of length X.  Now we should check if length
           * is valid, then use the first point as the farm location
           */

          // If we haven't centered the individual map yet, let's do so now
          if (!this.individualMapCenter) {
            if (loc.pointOneLat) {
              this.individualMapCenter = new google.maps.LatLng(loc.pointOneLat, loc.pointOneLong);
            } else if (loc.length) {
              this.individualMapCenter = new google.maps.LatLng(loc[0].lat, loc[1].lng);
            }
          }

          if (loc.pointOneLat) {
            // Add the location and the date to the individual visit list.
            // The date will be used in the info window for each marker
            this.individualVisitList.push({
              loc: {
                lat: loc.pointOneLat,
                lng: loc.pointOneLong
              }, info: this.buildIndivTitle(visitList[i])
            });
          } else if (loc.length) {
            // Add the location and the date to the individual visit list.
            // The date will be used in the info window for each marker
            this.individualVisitList.push({
              loc: {
                lat: loc[0].lat,
                lng: loc[0].lng
              }, info: this.buildIndivTitle(visitList[i])
            });
          }


        } else if (visitList[i].farmerInformation.villageGPSLat) {
          const loc = visitList[i].farmerInformation;

          // If we haven't centered the map yet, let's do so now
          if (!this.individualMapCenter) {
            this.individualMapCenter = new google.maps.LatLng(loc.villageGPSLat, loc.villageGPSLong);
          }

          this.individualVisitList.push({
            lat: loc.villageGPSLat,
            lng: loc.villageGPSLong
          });
        }

      }
    }
  }

  buildIndivTitle(visitInfo) {
    let title = 'Farmer: ';
    title += visitInfo.farmerInformation.name;
    title += ' | Date: ';
    let date = new Date(visitInfo.visitInformation.visitDate);
    title += date.toDateString();
    return title;
  }

  buildGroupTitle(visitInfo) {
    let title = 'Group: ';
    title += visitInfo.groupDetails.groupName;
    title += ' | Date: ';
    let date = new Date(visitInfo.visitInformation.visitDate);
    title += date.toDateString();
    return title;
  }

  buildPlatformTitle(visitInfo) {
    let title = 'Topic: ';
    title += visitInfo.topic;
    title += ' | Date: ';
    let date = new Date(visitInfo.meetingDate);
    title += date.toDateString();
    return title;
  }

  loadLocationTracking(locationList) {
    if (locationList && locationList.length > 0) {
      this.hasHeatmapLocations = true;
      this.locationTrackingCount = locationList.length;
      this.filteredLocationCount = this.locationTrackingCount;

      // Center the heatmap
      this.heatmapCenter = new google.maps.LatLng(locationList[0].latitude, locationList[0].longitude);

      // Set the LatLong array for the heatmap layer
      for (let i = 0; i < locationList.length; i++) {
        let pnt = new google.maps.LatLng(locationList[i].latitude, locationList[i].longitude);
        let d = new Date(locationList[i].timestamp);
        this.heatmapData.push(pnt);
        this.heatmapUnfiltered.push({
          location: pnt,
          date: d
        })
      }
    } else {
      this.hasHeatmapLocations = false;
    }
  }

  filterHeatmap(dateString) {
    this.locationFilterString = dateString;
    this.heatmapData = [];
    let date = new Date();
    let today = date.getDay();
    let todayZerod = date.setHours(0, 0, 0, 0);
    let month = date.getMonth();
    let year = date.getFullYear();

    switch (dateString.toLowerCase()) {
      case 'today':
        for (let i = 0; i < this.heatmapUnfiltered.length; i++) {
          let d = new Date(this.heatmapUnfiltered[i].date);
          if (d.toDateString() === date.toDateString()) {
            this.heatmapData.push(this.heatmapUnfiltered[i].location);
          }
        }
        break;
      case 'this week':
        let now = new Date();
        now.setHours(0, 0, 0, 0);
        let day = now.getDay();
        let date1 = now.getDate() - day;

        // Grabbing Start/End Dates
        let startDate = new Date(now.setDate(date1));
        let endDate = new Date(now.setDate(date1 + 6));
        endDate.setHours(23, 59, 59, 999);

        for (let i = 0; i < this.heatmapUnfiltered.length; i++) {
          let d = new Date(this.heatmapUnfiltered[i].date);
          if (d >= startDate && d <= endDate) {
            this.heatmapData.push(this.heatmapUnfiltered[i].location);
          }
        }

        break;
      case 'last week':
        let to = new Date(date.setTime(date.getTime() - (date.getDay() ? date.getDay() : 7) * 24 * 60 * 60 * 1000));
        to.setHours(23, 59, 59, 999);
        let from = new Date(date.setTime(date.getTime() - 6 * 24 * 60 * 60 * 1000));
        from.setHours(0, 0, 0, 0);

        for (let i = 0; i < this.heatmapUnfiltered.length; i++) {
          let d = new Date(this.heatmapUnfiltered[i].date);
          if (d >= from && d <= to) {
            this.heatmapData.push(this.heatmapUnfiltered[i].location);
          }
        }
        break;
      case 'this month':
        for (let i = 0; i < this.heatmapUnfiltered.length; i++) {
          let d = new Date(this.heatmapUnfiltered[i].date);
          if (d.getMonth() === month && d.getFullYear() === year) {
            this.heatmapData.push(this.heatmapUnfiltered[i].location);
          }
        }
        break;
      case 'last month':
        for (let i = 0; i < this.heatmapUnfiltered.length; i++) {
          let d = new Date(this.heatmapUnfiltered[i].date);

          // If it's january, we need to check against last year
          if (month !== 0) {
            if (d.getMonth() === month - 1 && d.getFullYear() === year) {
              this.heatmapData.push(this.heatmapUnfiltered[i].location);
            }
          } else {
            if (d.getMonth() === 12 && d.getFullYear() === year - 1) {
              this.heatmapData.push(this.heatmapUnfiltered[i].location);
            }
          }
        }
        break;
      case 'this year':
        for (let i = 0; i < this.heatmapUnfiltered.length; i++) {
          let d = new Date(this.heatmapUnfiltered[i].date);
          if (d.getFullYear() === year) {
            this.heatmapData.push(this.heatmapUnfiltered[i].location);
          }
        }
        break;
      case 'all':
        for (let i = 0; i < this.heatmapUnfiltered.length; i++) {
          this.heatmapData.push(this.heatmapUnfiltered[i].location);
        }
    }

    this.filteredLocationCount = this.heatmapData.length;
  }

  updateIndividualGoal() {
    this.extensionWorker.individualGoal = this.individualVisitGoal;
    this.userObject.update({
      individualGoal: this.individualVisitGoal
    });
  }

  updateGroupGoal() {
    this.extensionWorker.groupGoal = this.groupVisitGoal;
    this.userObject.update({
      groupGoal: this.groupVisitGoal
    });
  }

  updatePlatformGoal() {
    this.extensionWorker.platformGoal = this.platformGoal;
    this.userObject.update({
      platformGoal: this.platformGoal
    });
  }

  /**
   * Helper method that will resize the google map when the accordion is expanded; needed to avoid greyed-out maps
   * The bootstrap accordion animation takes 350ms, to wait for 351 and then trigger the google maps resize event
   */
  locationTrackingMapResize() {
    setTimeout(() => {
      google.maps.event.trigger(this.locationTrackingMap, 'resize');
    }, 351);
  }

  /**
   * Helper method that will resize the google map when the accordion is expanded; needed to avoid greyed-out maps
   */
  individualFarmMapResize() {
    setTimeout(() => {
      google.maps.event.trigger(this.individualFarmMap, 'resize');
    }, 351);
  }

  /**
   * Helper method that will resize the google map when the accordion is expanded; needed to avoid greyed-out maps
   */
  groupFarmMapResize() {
    setTimeout(() => {
      google.maps.event.trigger(this.groupFarmMap, 'resize');
    }, 351);
  }

  /**
   * Helper method that will resize the google map when the accordion is expanded; needed to avoid greyed-out maps
   */
  platformMapResize() {
    setTimeout(() => {
      google.maps.event.trigger(this.platformMap, 'resize');
    }, 351);
  }

  /**
   * Helper method to display a 'map loading' message while the maps load
   */
  individualMapLoadedEvent() {
    this.individualMapLoaded = true;
  }

  /**
   * Helper method to display a 'map loading' message while the maps load
   */
  platformMapLoadedEvent() {
    this.platformMapLoaded = true;
  }

  /**
   * Helper method to display a 'map loading' message while the maps load
   */
  groupMapLoadedEvent() {
    this.groupMapLoaded = true;
  }

  /**
   * Helper method to display a 'map loading' message while the maps load
   */
  locationMapLoadedEvent() {
    this.locationMapLoaded = true;
  }

  /**
   * Helper method to build a string assigning unique modal ids to each stakeholder platform
   * @param plat
   * @returns {string}
   */
  getId(plat) {
    return 'modal' + this.platformList.indexOf(plat).toString();
  }

  /**
   * Save the new manager to the firebase user object
   */
  updateManager() {
    this.userObject.update({
      manager: this.currentManager
    });
    this.flash.show('User successfully updated', {cssClass: 'alert-success', timeout: 2000});
  }

  /**
   * Save the new fullName to the firebase user object
   */
  updateName() {
    this.userObject.update({
      fullName: this.fullName
    });
    this.flash.show('User successfully updated', {cssClass: 'alert-success', timeout: 2000});
  }

  /**
   * Save the new district and area to the firebase user object
   */
  updateAssignedArea(location) {
    this.district = location.district.name;
    this.area = location.area;
    this.userObject.update({
      district: this.district,
      area: this.area
    });
    this.flash.show('User successfully updated', {cssClass: 'alert-success', timeout: 2000});
  }

  /**
   * Expand all accordion tabs
   */
  expandAll() {
    this.expanded = true;

    // Remove the 'hide' class from all accordion tabs
    this.rd.removeClass(this.collapseOne.nativeElement, 'hide');
    this.rd.removeClass(this.collapseTwo.nativeElement, 'hide');
    this.rd.removeClass(this.collapseThree.nativeElement, 'hide');
    this.rd.removeClass(this.collapseFour.nativeElement, 'hide');
    this.rd.removeClass(this.collapseFive.nativeElement, 'hide');
    this.rd.removeClass(this.collapseSix.nativeElement, 'hide');

    // Add the 'show' class to all accordion tabs
    this.rd.addClass(this.collapseOne.nativeElement, 'show');
    this.rd.addClass(this.collapseTwo.nativeElement, 'show');
    this.rd.addClass(this.collapseThree.nativeElement, 'show');
    this.rd.addClass(this.collapseFour.nativeElement, 'show');
    this.rd.addClass(this.collapseFive.nativeElement, 'show');
    this.rd.addClass(this.collapseSix.nativeElement, 'show');
  }

  /**
   * Collapse all accordion tabs
   */
  collapseAll() {
    this.expanded = false;

    // Remove the 'show' class from all accordion tabs
    this.rd.removeClass(this.collapseOne.nativeElement, 'show');
    this.rd.removeClass(this.collapseTwo.nativeElement, 'show');
    this.rd.removeClass(this.collapseThree.nativeElement, 'show');
    this.rd.removeClass(this.collapseFour.nativeElement, 'show');
    this.rd.removeClass(this.collapseFive.nativeElement, 'show');
    this.rd.removeClass(this.collapseSix.nativeElement, 'show');

    // Add the 'hide' class to all accordion tabs
    this.rd.addClass(this.collapseOne.nativeElement, 'hide');
    this.rd.addClass(this.collapseTwo.nativeElement, 'hide');
    this.rd.addClass(this.collapseThree.nativeElement, 'hide');
    this.rd.addClass(this.collapseFour.nativeElement, 'hide');
    this.rd.addClass(this.collapseFive.nativeElement, 'hide');
    this.rd.addClass(this.collapseSix.nativeElement, 'hide');
  }

  /**
   * Calls the browser print dialog
   * @returns {boolean}
   */
  print() {
    // Call the print dialog
    window.print();
    return false;
  }
}
