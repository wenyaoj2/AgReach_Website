import {Component, OnInit, ViewChild, ElementRef, Renderer2} from '@angular/core';
import {FirebaseService} from '../../services/firebase.service';
import {AuthService} from '../../services/auth.service';
import {Router} from '@angular/router';
import {StatService} from '../../services/stat.service';
import {AngularFireAuth} from 'angularfire2/auth';
import {UserService} from '../../services/user.service';

enum PermissionLevel {
  none = 0,
  manager = 1,
  stakeholder = 2,
  admin = 3
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  email;

  permissionLevel: PermissionLevel;

  // Should we display or hide the 'Subordinates' tab
  hasSubordinates = false;
  // Store the user's subordinates, if any
  subordinateList = [];

  // These will hold the activities for the current user's subordinates
  individualVisits = {};
  groupVisits = {};
  platforms = {};

  // Used to hold the user's assigned district, if applicable
  userDistrict: string;

  // These will hold pie chart information for the current user's team members
  subordinatePieChart = {};
  subordinateMonthlyPieChart = {};

  // A hashtable for displaying the progress of each team member
  subordinateProgress = {};

  // These will hold booleans for each subordinate and tell our form which data to display
  hasLifetimeData = {};
  hasMonthyData = {};

  // We'll use these a couple times, so just declare them up here
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();

  // Variables used to display the subordinates' pie charts
  public pieChartLabels: string[] = ['Individual Farm Visits', 'Group Farm Visits', 'Stakeholder Platforms'];
  public pieChartType = 'pie';
  public chartColors: Array<any> = [{backgroundColor: ['#01b575', '#4ce7b3', '#a3fcde'], borderColor: 'transparent'}];

  // Used to display national-level contact by type chart
  nationalContactChart = [0, 0, 0, 0];
  nationContactChartLabels: string[] = ['Farmer/Producer', 'Government', 'Private Sector', 'Civil Society/NGO'];
  nationalContactChartType = 'doughnut';


  // National-level contacts by district chart
  contactsByDistrictChart = {};
  contactsByDistrictLabels: string[] = [];
  contactsByDistrictValues: number[] = [];


  // National-level interactions by type chart
  nationalInteractionsByTypeValues: number[] = [0, 0, 0];
  nationalInteractionsByTypeLabels = ['Individual Farm Visits', 'Group Farm Visits', 'Stakeholder Platforms'];

  // National-level interactions by district chart
  combinedByDistrict;
  nationalInteractionsByDistrictLabels: string[] = [];
  nationalInteractionsByDistrictValues: number[] = [];

  // National-level interactions by type this month chart
  nationalInteractionsByTypeTMValues: number[] = [0, 0, 0];

  // National-level interactions by type last month chart
  nationalInteractionsByTypeLMValues: number[] = [0, 0, 0];

  // National-level interaction details table
  districtsWithStats = [];
  nationalDistrictList = {};
  districtIndivStats = {};
  districtGroupStats = {};
  districtPlatformStats = {};
  contactStats = {};
  extWorkerByDistrict = {};

  // National-level interactions over time chart
  nationalInteractionChartLabels = [];
  nationalInteractionChartLabelsLM = [];
  nationalInteractionChartData = [{data: [], label: ''}];
  nationalInteractionChartDataLM = [{data: [], label: ''}];
  nationalInteractionChartOptions = {
    scaleShowVerticalLines: false,
    responsive: true,
    scaleShowValues: true,
    scaleValuePaddingX: 10,
    scaleValuePaddingY: 10,
    scales: {
      yAxes: [{
        ticks: {
          beginAtZero: true,
          callback: function (dataLabel, index) {
            return dataLabel % 1 === 0 ? dataLabel : '';
          }
        }
      }]
    }
  };
  nationalInteractionChartColors = {
    backgroundColor: 'rgba(148,159,177,0.2)',
    borderColor: 'rgba(148,159,177,1)',
    pointBackgroundColor: 'rgba(148,159,177,1)',
    pointBorderColor: '#fff',
    pointHoverBackgroundColor: '#fff',
    pointHoverBorderColor: 'rgba(148,159,177,0.8)'
  };

  // National-level visit maps
  nationalMapCenterTM;
  nationalIndivTM = 0;
  nationalGroupTM = 0;
  nationalPlatformTM = 0;
  nationalIndivLM = 0;
  nationalGroupLM = 0;
  nationalPlatformLM = 0;
  nationalMapCenterLM;
  nationalPointsTM = [];
  nationalPointsLM = [];
  nationalMapReadyTM = false;
  nationalMapReadyLM = false;

  // District-level extension worker table
  districtExtensionWorkerList;
  districtHasWorkers = false;

  // District-level progress bars
  individualProgress = 0;
  individualGoal = 0;
  groupProgress = 0;
  groupGoal = 0;
  platformProgress = 0;
  platformGoal = 0;

  // District-level visit map & table
  districtMapCenter;
  districtPoints = [];
  districtMapReady = false;
  distIndiv = [];
  distGroup = [];
  distPlatform = [];

  // Your Team visit maps
  subordinateMapCenter = {};
  subordinateMapMarkers = {};
  teamMapReady = false;


  /**
   * This page uses ng2-charts, which unfortunately isn't good about updating the charts with asynchronous data
   * The follow boolean values are used to hide our charts until the relevant data has loaded, after which point
   * the bool is flipped and the charts can load
   */
  nationalInteractionsByTypeReady = false;
  nationalInteractionsThisMonthReady = false;
  nationalInteractionsLastMonthReady = false;
  nationalInteractionsByDistrictReady = false;
  showContactsByDistrict = false;
  nationalChartAvailable = false;

  constructor(private router: Router,
              private afAuth: AngularFireAuth,
              private firebaseService: FirebaseService,
              private authService: AuthService,
              private statService: StatService,
              private userService: UserService,
              private rd: Renderer2) {
    this.afAuth.authState.subscribe(user => {
      if (!user) {
        // Not logged in, redirect to login page
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnInit() {
    // Call the auth service to return the firebase user object
    this.authService.getUser().then(user => {
      if (!user) {
        // User is not logged in, redirect to login page
        this.router.navigate(['/login']);
      } else {
        // Set the current user
        this.email = user.email;

        // Initialize the userService
        this.userService.init();

        // Initialize the stat service
        this.statService.init().then(() => {
          // Call the auth service to get the user's permission level
          this.authService.getPermissionLevel().then((permission: PermissionLevel) => {
            this.permissionLevel = permission;
          });

          // Call the auth service to get the user's assigned location
          this.authService.getAssignedLocation().then((location: any) => {
            if (location) {
              if (location.district) {
                this.userDistrict = location.district;
                this.getDistrictStats();
              }
            }
          });

          // Get the current user's subordinates, if any
          this.getSubordinates();

          // Only show national stats to admin or stakeholders
          if (this.permissionLevel !== PermissionLevel.manager) {
            this.getNationalStats();
          }
        });
      }
    }).catch((err) => {
      // An error occurred with authentication, redirect to login page
      // this.router.navigate(['/login']);
      console.log(err);
    });
  }

  /**
   * This will handle the logic for building the 'National Overview' panel
   */
  getNationalStats() {

    // First we'll gather stats about contacts
    this.firebaseService.getContacts().subscribe(extWorkerContacts => {
      for (let i = 0; i < extWorkerContacts.length; i++) {
        this.firebaseService.getIndividualContact(extWorkerContacts[i].$key).subscribe(contactList => {
          for (let k = 0; k < contactList.length; k++) {
            switch (contactList[k].contactType.toLowerCase()) {
              case 'farmer/producer':
                this.nationalContactChart[0]++;
                break;
              case 'government':
                this.nationalContactChart[1]++;
                break;
              case 'private sector':
                this.nationalContactChart[2]++;
                break;
              case 'civil society/ngo':
                this.nationalContactChart[3]++;
                break;
            }

            // Build a hashtable that will store the number of contacts by district
            if (this.contactsByDistrictChart[contactList[k].district]) {
              this.contactsByDistrictChart[contactList[k].district]++;
            } else {
              this.contactsByDistrictChart[contactList[k].district] = 1;
            }

            // ng2-charts doesn't like hashtables, so let's generate the string[] of labels and number[] of values
            let labels: string[] = [];
            let values: number[] = [];
            let tempChart = this.contactsByDistrictChart;
            Object.keys(this.contactsByDistrictChart).forEach(function (key) {
              labels.push(key);
              values.push(tempChart[key]);
            });
            this.contactsByDistrictLabels = labels;
            this.contactsByDistrictValues = values;
            this.showContactsByDistrict = true;
          }
          this.nationalChartAvailable = true;
        });
      }
    });

    let indivStats = this.statService.getIndividualVisitStats();
    let groupStats = this.statService.getGroupVisitStats();
    let platformStats = this.statService.getPlatformStats();

    // Build the Interactions By Type chart
    this.nationalInteractionsByTypeValues[0] = indivStats.total;
    this.nationalInteractionsByTypeValues[1] = groupStats.total;
    this.nationalInteractionsByTypeValues[2] = platformStats.total;
    // Make the chart visible
    this.nationalInteractionsByTypeReady = true;
    // This month
    this.nationalInteractionsByTypeTMValues[0] = indivStats.thisMonth;
    this.nationalInteractionsByTypeTMValues[1] = groupStats.thisMonth;
    this.nationalInteractionsByTypeTMValues[2] = platformStats.thisMonth;
    // Make the chart visible
    this.nationalInteractionsThisMonthReady = true;
    // Last month
    this.nationalInteractionsByTypeLMValues[0] = indivStats.lastMonth;
    this.nationalInteractionsByTypeLMValues[1] = groupStats.lastMonth;
    this.nationalInteractionsByTypeLMValues[2] = platformStats.lastMonth;
    // Make the chart visible
    this.nationalInteractionsLastMonthReady = true;

    // Build the Interactions By District (Lifetime) chart
    this.combinedByDistrict = this.statService.getInteractionCountByDistrict();
    if (this.combinedByDistrict) {
      this.nationalInteractionsByDistrictLabels = this.combinedByDistrict.lifetime.labels;
      this.nationalInteractionsByDistrictValues = this.combinedByDistrict.lifetime.values;
      this.nationalInteractionsByDistrictReady = true;
    }


    // Build the Interactions By District chart
    this.nationalDistrictList = this.statService.getAllDistricts();
    this.districtsWithStats = this.statService.getDistrictsWithStats();

    this.statService.getExtWorkerByDistrictCount().then(table => {
      for (let i = 0; i < this.districtsWithStats.length; i++) {
        let district = this.districtsWithStats[i];
        this.extWorkerByDistrict[district] = table[district] || 0;
      }
    });

    // Visits This Month Chart
    let individualThisMonthArray = [];
    let groupThisMonthArray = [];
    let platformThisMonthArray = [];

    // Visits Last Month Chart
    let individualLastMonthArray = [];
    let groupLastMonthArray = [];
    let platformLastMonthArray = [];

    // Set the chart labels
    let tempLabels = [];
    this.nationalInteractionChartLabels = [];
    this.nationalInteractionChartLabelsLM = [];

    for (let i = 0; i < this.districtsWithStats.length; i++) {
      this.districtIndivStats[this.districtsWithStats[i]] = this.statService.getIndividualVisitStats(this.districtsWithStats[i]);
      this.districtGroupStats[this.districtsWithStats[i]] = this.statService.getGroupVisitStats(this.districtsWithStats[i]);
      this.districtPlatformStats[this.districtsWithStats[i]] = this.statService.getPlatformStats(this.districtsWithStats[i]);

      tempLabels.push(this.districtsWithStats[i]);
      this.nationalInteractionChartLabels.push(this.districtsWithStats[i]);
      this.nationalInteractionChartLabelsLM.push(this.districtsWithStats[i]);

      individualThisMonthArray.push(this.districtIndivStats[this.districtsWithStats[i]].thisMonth);
      groupThisMonthArray.push(this.districtGroupStats[this.districtsWithStats[i]].thisMonth);
      platformThisMonthArray.push(this.districtPlatformStats[this.districtsWithStats[i]].thisMonth);

      individualLastMonthArray.push(this.districtIndivStats[this.districtsWithStats[i]].lastMonth);
      groupLastMonthArray.push(this.districtGroupStats[this.districtsWithStats[i]].lastMonth);
      platformLastMonthArray.push(this.districtPlatformStats[this.districtsWithStats[i]].lastMonth);
    }

    // Load the 'Visits This Month' Map
    this.statService.getAllVisitsThisMonth().then((visits: any) => {
      if (visits && visits.length === 3) {
        // Display the visit counts under the map
        let indiv = visits[0];
        this.nationalIndivTM = indiv.length;
        let group = visits[1];
        this.nationalGroupTM = group.length;
        let platform = visits[2];
        this.nationalPlatformTM = platform.length;

        // Loop through and add each individual visit to the map
        for (let i = 0; i < indiv.length; i++) {
          const loc = indiv[i].farmLocation;

          if (loc) {
            // If we haven't centered the map yet, let's do so now
            if (!this.nationalMapCenterTM) {
              if (loc.pointOneLat) {
                this.nationalMapCenterTM = new google.maps.LatLng(loc.pointOneLat, loc.pointOneLong);
              } else if (loc.length) {
                this.nationalMapCenterTM = new google.maps.LatLng(loc[0].lat, loc[1].lng);
              }
            }

            if (loc.pointOneLat) {
              this.nationalPointsTM.push({
                loc: loc.pointOneLat + ', ' + loc.pointOneLong,
                info: this.buildIndivTitle(indiv[i]),
                class: 'individual-marker'
              });
            } else if (loc.length) {
              this.nationalPointsTM.push({
                loc: loc[0].lat + ', ' + loc[0].lng,
                info: this.buildIndivTitle(indiv[i]),
                class: 'individual-marker'
              });
            }
          }
        }

        // Loop through and add each group visit to the map
        for (let i = 0; i < group.length; i++) {
          const loc = group[i].groupDetails.villageLocation;

          if (loc) {
            // If we haven't centered the map yet, let's do so now
            if (!this.nationalMapCenterTM) {
              this.nationalMapCenterTM = loc;
            }

            this.nationalPointsTM.push({
              loc: loc,
              info: this.buildGroupTitle(group[i]),
              class: 'group-marker'
            });
          }
        }

        // Loop through and add each stakeholder platform to the map
        for (let i = 0; i < platform.length; i++) {
          if (platform[i].villageGPSLat) {
            if (!this.nationalMapCenterTM) {
              this.nationalMapCenterTM = platform[i].villageGPSLat + ', ' + platform[i].villageGPSLong;
            }

            this.nationalPointsTM.push({
              loc: platform[i].villageGPSLat + ', ' + platform[i].villageGPSLong,
              info: this.buildPlatformTitle(platform[i]),
              class: 'platform-marker'
            });
          }
        }


      }
    });

    // Load the 'Visits Last Month' Map
    this.statService.getAllVisitsLastMonth().then((visits: any) => {
      if (visits && visits.length === 3) {
        // Display the visit counts under the map
        let indiv = visits[0];
        this.nationalIndivLM = indiv.length;
        let group = visits[1];
        this.nationalGroupLM = group.length;
        let platform = visits[2];
        this.nationalPlatformLM = platform.length;

        // Loop through and add each individual visit to the map
        for (let i = 0; i < indiv.length; i++) {
          const loc = indiv[i].farmLocation;

          if (loc) {
            // If we haven't centered the map yet, let's do so now
            if (!this.nationalMapCenterLM) {
              if (loc.pointOneLat) {
                this.nationalMapCenterLM = new google.maps.LatLng(loc.pointOneLat, loc.pointOneLong);
              } else if (loc.length) {
                this.nationalMapCenterLM = new google.maps.LatLng(loc[0].lat, loc[1].lng);
              }
            }

            if (loc.pointOneLat) {
              this.nationalPointsLM.push({
                loc: loc.pointOneLat + ', ' + loc.pointOneLong,
                info: this.buildIndivTitle(indiv[i]),
                class: 'individual-marker'
              });
            } else if (loc.length) {
              this.nationalPointsLM.push({
                loc: loc[0].lat + ', ' + loc[0].lng,
                info: this.buildIndivTitle(indiv[i]),
                class: 'individual-marker'
              });
            }
          }
        }

        // Loop through and add each group visit to the map
        for (let i = 0; i < group.length; i++) {
          const loc = group[i].groupDetails.villageLocation;

          if (loc) {
            // If we haven't centered the map yet, let's do so now
            if (!this.nationalMapCenterLM) {
              this.nationalMapCenterLM = loc;
            }

            this.nationalPointsLM.push({
              loc: loc,
              info: this.buildGroupTitle(group[i]),
              class: 'group-marker'
            });
          }
        }

        // Loop through and add each stakeholder platform to the map
        for (let i = 0; i < platform.length; i++) {
          if (platform[i].villageGPSLat) {
            if (!this.nationalMapCenterLM) {
              this.nationalMapCenterLM = platform[i].villageGPSLat + ', ' + platform[i].villageGPSLong;
            }

            this.nationalPointsLM.push({
              loc: platform[i].villageGPSLat + ', ' + platform[i].villageGPSLong,
              info: this.buildPlatformTitle(platform[i]),
              class: 'platform-marker'
            });
          }
        }


      }
    });

    /**
     12/27/17: The following code will remove districts from the national-level interaction graphs if they have 0 visits for
     the given month.  For now, we've decided to show those districts.  Commenting this code rather than deleting in case
     the client ever wants to switch it back.

     // using concat because we just want identical arrays, not identical object references which will cause splice to mess up
     for (let i = 0; i < tempLabels.length; i++) {
      let district = tempLabels[i];

      // Clean up the 'This Month' chart
      let index = this.nationalInteractionChartLabels.indexOf(district);
      if (individualThisMonthArray[index] === 0 && groupThisMonthArray[index] === 0 && platformThisMonthArray[index] === 0) {
        individualThisMonthArray.splice(index, 1);
        groupThisMonthArray.splice(index, 1);
        platformThisMonthArray.splice(index, 1);
        this.nationalInteractionChartLabels.splice(index, 1);
      }

      // Clean up the 'Last Month' chart
      let indexLM = this.nationalInteractionChartLabelsLM.indexOf(district);
      if (individualLastMonthArray[indexLM] === 0 && groupLastMonthArray[indexLM] === 0 && platformLastMonthArray[indexLM] === 0) {
        individualLastMonthArray.splice(indexLM, 1);
        groupLastMonthArray.splice(indexLM, 1);
        platformLastMonthArray.splice(indexLM, 1);
        this.nationalInteractionChartLabelsLM.splice(indexLM, 1);
      }
    }
     **/

    this.contactStats = this.statService.getContactStats();

    // Build the interactions over time charts

    // Add the new dataset for individual visits this month
    this.nationalInteractionChartData[0] = {
      data: individualThisMonthArray,
      label: 'Individual Visits'
    };
    this.nationalInteractionChartData.push({
      data: groupThisMonthArray,
      label: 'Group Visits'
    });
    this.nationalInteractionChartData.push({
      data: platformThisMonthArray,
      label: 'Stakeholder Platforms'
    });

    // Add the new dataset for individual visits last month
    this.nationalInteractionChartDataLM[0] = {
      data: individualLastMonthArray,
      label: 'Individual Visits'
    };
    this.nationalInteractionChartDataLM.push({
      data: groupLastMonthArray,
      label: 'Group Visits'
    });
    this.nationalInteractionChartDataLM.push({
      data: platformLastMonthArray,
      label: 'Stakeholder Platforms'
    });
  }

  /**
   * This function will handle the majority of the logic for rendering the District Overview panel
   */
  getDistrictStats() {
    if (this.userDistrict) {
      this.statService.getExtensionWorkersForDistrict(this.userDistrict).then(list => {
        this.districtExtensionWorkerList = list;
        this.districtHasWorkers = this.districtExtensionWorkerList.length > 0;

        for (let i = 0; i < this.districtExtensionWorkerList.length; i++) {
          let manager = this.districtExtensionWorkerList[i].manager;
          if (manager) {
            this.getUser(manager).then((managerObject: any) => {
              this.districtExtensionWorkerList[i].manager = managerObject;
            });
          }
        }

        this.statService.getProgressForDistrict(this.userDistrict).then((progress: any) => {
          if (progress) {
            this.individualGoal = progress.individualGoal;
            this.individualProgress = progress.individualProgress;
            this.groupGoal = progress.groupGoal;
            this.groupProgress = progress.groupProgress;
            this.platformGoal = progress.platformGoal;
            this.platformProgress = progress.platformProgress;
          }
          /*
          statService.getDistrictVisitsThisMonth relies on data cached during statService.getProgressForDistrict, which
          is why it's located within .then().  They could also be forkJoin'd, but don't call them asynchronously, or else
          getDistrictVisitsThisMonth won't work
           */

          this.statService.getDistrictVisitsThisMonth().then((value: any) => {
            if (value && value.length === 3) {
              // Get the visits for the district
              let individualVisits = value[0][this.userDistrict];
              let groupVisits = value[1][this.userDistrict];
              let platformVisits = value[2][this.userDistrict];
              this.distIndiv = individualVisits;
              this.distGroup = groupVisits;
              this.distPlatform = platformVisits;

              // Loop through the individual visits to build the map points
              if (this.distIndiv) {
                for (let i = 0; i < this.distIndiv.length; i++) {
                  // Set the user
                  this.getUser(this.distIndiv[i].email).then(user => {
                    this.distIndiv[i].user = user;
                  });

                  const loc = this.distIndiv[i].farmLocation;

                  if (loc) {
                    // If we haven't centered the map yet, let's do so now
                    if (!this.districtMapCenter) {
                      if (loc.pointOneLat) {
                        this.districtMapCenter = new google.maps.LatLng(loc.pointOneLat, loc.pointOneLong);
                      } else if (loc.length) {
                        this.districtMapCenter = new google.maps.LatLng(loc[0].lat, loc[1].lng);
                      }
                    }

                    if (loc.pointOneLat) {
                      this.districtPoints.push({
                        loc: loc.pointOneLat + ', ' + loc.pointOneLong,
                        info: this.buildIndivTitle(this.distIndiv[i]),
                        class: 'individual-marker'
                      });
                    } else if (loc.length) {
                      this.districtPoints.push({
                        loc: loc[0].lat + ', ' + loc[0].lng,
                        info: this.buildIndivTitle(this.distIndiv[i]),
                        class: 'individual-marker'
                      });
                    }
                  }
                }
              }

              if (this.distGroup) {
                // Loop through the group visits to build the map points
                for (let i = 0; i < this.distGroup.length; i++) {
                  // Set the user
                  this.getUser(this.distGroup[i].email).then(user => {
                    this.distGroup[i].user = user;
                  });
                  if (this.distGroup[i].groupDetails.villageLocation) {
                    this.districtPoints.push({
                      loc: this.distGroup[i].groupDetails.villageLocation,
                      info: this.buildGroupTitle(this.distGroup[i]),
                      class: 'group-marker'
                    });
                  }
                }
              }

              if (this.distPlatform) {
                // Loop through the stakeholder platforms to build the map points
                for (let i = 0; i < this.distPlatform.length; i++) {
                  // Set the user
                  this.getUser(this.distPlatform[i].email).then(user => {
                    this.distPlatform[i].user = user;
                  });
                  if (this.distPlatform[i].villageGPSLat) {
                    this.districtPoints.push({
                      loc: this.distPlatform[i].villageGPSLat + ', ' + this.distPlatform[i].villageGPSLong,
                      info: this.buildPlatformTitle(this.distPlatform[i]),
                      class: 'platform-marker'
                    });
                  }
                }
              }
            }
          });
        });

      });
    }
  }

  /**
   * Build the "Your Team" tab
   */
  getSubordinates() {
    this.firebaseService.getSubordinates(this.email).subscribe(subs => {
      if (subs && subs.length > 0) {
        this.hasSubordinates = true;
        this.subordinateList = subs;

        // Initialize the pie chart object for each subordinate
        for (let i = 0; i < subs.length; i++) {
          this.subordinatePieChart[subs[i].email] = [0, 0, 0];
          this.subordinateMonthlyPieChart[subs[i].email] = [0, 0, 0];

          // Initialize the visit lists
          this.individualVisits[subs[i].email] = [];
          this.groupVisits[subs[i].email] = [];
          this.platforms[subs[i].email] = [];

          // Initialize the progress bars
          this.subordinateProgress[subs[i].email] = {};

          // Initialize the maps
          this.subordinateMapCenter[subs[i].email] = '';
          this.subordinateMapMarkers[subs[i].email] = [];

          // Initialize the display objects
          /*this.hasLifetimeData[subs[i].email] = false;
          this.hasMonthyData[subs[i].email] = false;*/
        }

        // Now that we have the subordinates, fetch their activities
        for (let i = 0; i < subs.length; i++) {
          this.getIndividualFarmVisits(subs[i].email);
          this.getGroupFarmVisits(subs[i].email);
          this.getPlatforms(subs[i].email, subs[i].$key);
          this.getProgress(subs[i].email, subs[i].$key);
        }

      } else {
        this.hasSubordinates = false;
      }
    });
  }

  /**
   * Retrieve the individual farm visits for the given extension worker
   * @param email
   */
  getIndividualFarmVisits(email) {
    this.firebaseService.getIndividualFarmVisits(email).subscribe(visits => {
      if (visits && visits.length > 0) {
        // this.individualVisits[email] = visits;
        // this.subordinatePieChart[email][0] = visits.length;
        this.hasLifetimeData[email] = true;

        // Loop through to see how many visits occurred this month
        for (let i = 0; i < visits.length; i++) {
          // Get the visit date
          let d = new Date(visits[i].visitInformation.visitDate);

          // If the visit was this month, increment the pie chart value
          if (d.getMonth() === this.currentMonth && d.getFullYear() === this.currentYear) {
            this.subordinateMonthlyPieChart[email][0]++;
            this.hasMonthyData[email] = true;

            // Add the visit to the individualVisit hashtable for displaying under the 'Your Team' tab
            this.individualVisits[email].push(visits[i]);

            // Add this visit to the map under the 'Your Team' tab
            if (visits[i].farmLocation) {
              if (visits[i].farmLocation.length && visits[i].farmLocation.length > 0) {
                let locationString = visits[i].farmLocation[0].lat + ', ' + visits[i].farmLocation[0].lng;
                // Center the map, if it hasn't been yet
                if (!this.subordinateMapCenter[email]) {
                  this.subordinateMapCenter[email] = locationString;
                }

                // Add the marker to the marker hashtable
                this.subordinateMapMarkers[email].push({
                  loc: locationString,
                  info: this.buildIndivTitle(visits[i]),
                  class: 'individual-marker'
                });
              } else if (visits[i].farmLocation.pointOneLat) {
                this.subordinateMapMarkers[email].push({
                  loc: visits[i].farmLocation.pointOneLat + ', ' + visits[i].farmLocation.pointOneLong,
                  info: this.buildIndivTitle(visits[i]),
                  class: 'individual-marker'
                });
              }
            }
          }
        }
      } else {
        this.individualVisits[email] = [];
        this.subordinatePieChart[email][0] = 0;
      }
    });
  }

  /**
   * Retrieve the group farm visits for the given extension worker
   * @param email
   */
  getGroupFarmVisits(email) {
    this.firebaseService.getGroupFarmVisits(email).subscribe(visits => {
      if (visits && visits.length > 0) {
        // this.groupVisits[email] = visits;
        // this.subordinatePieChart[email][1] = visits.length;
        this.hasLifetimeData[email] = true;

        // Loop through to see how many visits occurred this month
        for (let i = 0; i < visits.length; i++) {
          // Get the visit date
          let d = new Date(visits[i].visitInformation.visitDate);

          // If the visit was this month, increment the pie chart value
          if (d.getMonth() === this.currentMonth && d.getFullYear() === this.currentYear) {
            this.subordinateMonthlyPieChart[email][1]++;
            this.hasMonthyData[email] = true;

            // Add this visit to the visit list
            this.groupVisits[email].push(visits[i]);

            // Add this visit to the map
            if (visits[i].groupDetails.villageLocation) {
              // Center the map, if it hasn't been yet
              if (!this.subordinateMapCenter[email]) {
                this.subordinateMapCenter[email] = visits[i].groupDetails.villageLocation;
              }

              this.subordinateMapMarkers[email].push({
                loc: visits[i].groupDetails.villageLocation,
                info: this.buildGroupTitle(visits[i]),
                class: 'group-marker'
              });
            }
          }
        }
      } else {
        this.groupVisits[email] = [];
        this.subordinatePieChart[email][1] = 0;
      }
    });
  }

  /**
   * Retrieve the stakeholder platforms for the given extension worker.
   * @param email - the extension worker's email address
   * @param id - the extension worker's firebase UID/$KEY
   */
  getPlatforms(email, id) {
    this.firebaseService.getStakeholderPlatforms(id).subscribe(plats => {
      if (plats && plats.length > 0) {
        // this.platforms[email] = plats;
        // this.subordinatePieChart[email][2] = plats.length;
        this.hasLifetimeData[email] = true;

        // Loop through to see how many visits occurred this month
        for (let i = 0; i < plats.length; i++) {
          // Get the visit date
          let d = new Date(plats[i].meetingDate);

          // If the visit was this month, increment the pie chart value
          if (d.getMonth() === this.currentMonth && d.getFullYear() === this.currentYear) {
            this.subordinateMonthlyPieChart[email][2]++;
            this.hasMonthyData[email] = true;

            // Add this platform to the platform list for displaying on the 'Your Team' tab
            this.platforms[email].push(plats[i]);

            // Add this to the map displayed on the 'Your Team' tab
            if (plats[i].villageGPSLat) {
              this.subordinateMapMarkers[email].push({
                loc: plats[i].villageGPSLat + ', ' + plats[i].villageGPSLong,
                info: this.buildPlatformTitle(plats[i]),
                class: 'platform-marker'
              });
            }
          }
        }
      } else {
        this.platforms[email] = [];
        this.subordinatePieChart[email][2] = 0;
      }
    });
  }

  /**
   * Retrieve the progress towards goals for the given extension worker
   * @param email
   */
  getProgress(email, key) {
    this.statService.getProgress(email, key).then(progress => {
      this.subordinateProgress[email] = progress;
    });
  }

  /**
   * Helper method that creates a label showing basic individual farm visit info when hovering over a map icon
   * @param visitInfo
   * @returns {string}
   */
  buildIndivTitle(visitInfo) {
    let title = '[Individual Visit]';

    // Stakeholders shouldn't be able to see individual farmer names
    if (this.permissionLevel !== PermissionLevel.stakeholder) {
      title += ' Farmer: ';
      title += visitInfo.farmerInformation.name;
    }
    title += ' | Date: ';
    let date = new Date(visitInfo.visitInformation.visitDate);
    title += date.toDateString();

    // Stakeholders shouldn't be able to see extension worker names
    if (this.permissionLevel !== PermissionLevel.stakeholder) {
      title += ' | Ext Worker: ';
      title += visitInfo.email;
    }

    return title;
  }

  /**
   * Helper method that creates a label showing basic group visit info when hovering over a map icon
   * @param visitInfo
   * @returns {string}
   */
  buildGroupTitle(visitInfo) {
    let title = '[Group Visit] Group: ';
    title += visitInfo.groupDetails.groupName;
    title += ' | Date: ';
    let date = new Date(visitInfo.visitInformation.visitDate);
    title += date.toDateString();

    // Stakeholders shouldn't be able to see extension worker names
    if (this.permissionLevel !== PermissionLevel.stakeholder) {
      title += ' | Ext Worker: ';
      title += visitInfo.email;
    }
    return title;
  }

  /**
   * Helper method that creates a label showing basic stakeholder platform info when hovering over a map icon
   * @param visitInfo
   * @returns {string}
   */
  buildPlatformTitle(visitInfo) {
    let title = '[Platform] Topic: ';
    title += visitInfo.topic;
    title += ' | Date: ';
    let date = new Date(visitInfo.meetingDate);
    title += date.toDateString();

    // Stakeholders shouldn't be able to see extension worker names
    if (this.permissionLevel !== PermissionLevel.stakeholder) {
      title += ' | Ext Worker: ';
      title += visitInfo.email;
    }
    return title;
  }

  /**
   * Returns the number of individual visits in the current month for the given extension worker
   * @param email
   * @returns {number}
   */
  getIndividualCountMonth(email): number {
    if (this.subordinateMonthlyPieChart && this.subordinateMonthlyPieChart[email]) {
      return this.subordinateMonthlyPieChart[email][0];
    } else {
      return 0;
    }
  }

  /**
   * Returns the number of group visits in the current month for the given extension worker
   * @param email
   * @returns {number}
   */
  getGroupCountMonth(email): number {
    if (this.subordinateMonthlyPieChart && this.subordinateMonthlyPieChart[email]) {
      return this.subordinateMonthlyPieChart[email][1];
    } else {
      return 0;
    }
  }

  /**
   * Returns the number of stakeholder platforms in the current month for the given extension worker
   * @param email
   * @returns {number}
   */
  getPlatformCountMonth(email): number {
    if (this.subordinateMonthlyPieChart && this.subordinateMonthlyPieChart[email]) {
      return this.subordinateMonthlyPieChart[email][2];
    } else {
      return 0;
    }
  }


  /**
   * Helper method to display the progress as a percentage on the front-end
   * @param progress
   * @param goal
   * @returns {string}
   */
  buildProgressLabel(progress, goal) {
    if (goal === 0) {
      return '0%';
    } else {
      return ((progress / goal) * 100).toFixed(0) + '%';
    }
  }

  /**
   * Helper method fired when the district map fully loads, sets a bool indicating load complete
   */
  districtMapLoaded() {
    this.districtMapReady = true;
  }

  nationalMapLoadedTM() {
    this.nationalMapReadyTM = true;
  }

  nationalMapLoadedLM() {
    this.nationalMapReadyLM = true;
  }

  /**
   * Helper method fired when the team-level maps fully load, sets a bool indicating load complete
   */
  teamMapLoaded() {
    this.teamMapReady = true;
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

  getUser(email) {
    return this.userService.getUser(email);
  }

}
