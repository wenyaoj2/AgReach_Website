import {Injectable} from '@angular/core';
import {FirebaseService} from './firebase.service';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/forkJoin';

@Injectable()
export class StatService {

  private individualVisitList;
  private groupVisitList;
  private platformList = [];
  private hasInitialized = false;
  private districtList = [];

  private currentYear = new Date().getFullYear();
  private currentMonth = new Date().getMonth();

  private individualVisitsByDist = {};
  private groupVisitsByDist = {};
  private platformsByDist = {};

  private individualVisitsThisMonth = 0;
  private individualVisitsLastMonth = 0;
  private groupVisitsThisMonth = 0;
  private groupVisitsLastMonth = 0;
  private platformsThisMonth = 0;
  private platformsLastMonth = 0;

  private contactsByDistrict = {};

  // Store all the visits this month, for each extension worker, in the district
  private districtVisitsTMIndiv = {};
  private districtVisitsTMGroup = {};
  private districtVisitsTMPlatform = {};

  // We'll use this to store the extension workers for each district, so that we can reuse the lists without duplicate queries
  private extensionWorkerDistrictList = {};

  constructor(private firebaseSvc: FirebaseService) {
  }

  /**
   * Initialize the array of individual farm visits
   * @returns {Promise<any>}
   */
  private initIndividual(): Promise<any> {
    return new Promise(resolve => {

      // Reset the counters before we begin
      this.individualVisitsThisMonth = 0;
      this.individualVisitsLastMonth = 0;
      this.groupVisitsThisMonth = 0;
      this.groupVisitsLastMonth = 0;
      this.platformsThisMonth = 0;
      this.platformsLastMonth = 0;
      this.individualVisitsByDist = {};

      this.firebaseSvc.getAllIndividualFarmVisits().subscribe(visits => {

        /**
         * Loop through the visits and insert values into the hashtable representing each district and its number of visits
         * Make sure to also note if the visit happened this month or last month
         */
        for (let i = 0; i < visits.length; i++) {
          let district = visits[i].farmerInformation.district;
          let d = new Date(visits[i].visitInformation.visitDate);

          // See if the visit happened this month
          let thisMonth: boolean = d.getMonth() === this.currentMonth && d.getFullYear() === this.currentYear;
          // See if the visit happened last month
          let lastMonth: boolean = d.getMonth() + 1 === this.currentMonth && d.getFullYear() === this.currentYear;

          // Take care of the fringe cases when it's currently january and the visit occurred in december
          if (d.getMonth() === 11) {
            lastMonth = this.currentMonth === 0 && d.getFullYear() === this.currentYear - 1;
          }

          // Increment the overall tracker for visits occurring this month
          if (thisMonth) {
            this.individualVisitsThisMonth++;
          }

          if (lastMonth) {
            this.individualVisitsLastMonth++;
          }

          // Build the district-specific hashtable
          if (this.individualVisitsByDist[district]) {
            this.individualVisitsByDist[district].total++;
            if (thisMonth) {
              this.individualVisitsByDist[district].thisMonth++;
            }
            if (lastMonth) {
              this.individualVisitsByDist[district].lastMonth++;
            }
          } else {
            this.individualVisitsByDist[district] = {
              total: 1,
              thisMonth: thisMonth ? 1 : 0,
              lastMonth: lastMonth ? 1 : 0
            };
          }
        }

        resolve(visits);
      });
    });
  }

  /**
   * Initialize the array of group farm visits
   * @returns {Promise<any>}
   */
  private initGroup(): Promise<any> {
    return new Promise(resolve => {
      this.firebaseSvc.getAllGroupFarmVisits().subscribe(visits => {

        /**
         * Loop through the visits and insert values into the hashtable representing each district and its number of visits
         * Make sure to also note if the visit happened this month or last month
         */
        for (let i = 0; i < visits.length; i++) {
          let district = visits[i].groupDetails.district;
          let d = new Date(visits[i].visitInformation.visitDate);

          // See if the visit happened this month
          let thisMonth: boolean = d.getMonth() === this.currentMonth && d.getFullYear() === this.currentYear;
          // See if the visit happened last month
          let lastMonth: boolean = d.getMonth() + 1 === this.currentMonth && d.getFullYear() === this.currentYear;

          // Take care of the fringe cases when it's currently january and the visit occurred in december
          if (d.getMonth() === 11) {
            lastMonth = this.currentMonth === 0 && d.getFullYear() === this.currentYear - 1;
          }

          // Increment the overall tracker for visits occurring this month
          if (thisMonth) {
            this.groupVisitsThisMonth++;
          }

          if (lastMonth) {
            this.groupVisitsLastMonth++;
          }

          // Build the district-specific hashtable
          if (this.groupVisitsByDist[district]) {
            this.groupVisitsByDist[district].total++;
            if (thisMonth) {
              this.groupVisitsByDist[district].thisMonth++;
            }
            if (lastMonth) {
              this.groupVisitsByDist[district].lastMonth++;
            }
          } else {
            this.groupVisitsByDist[district] = {
              total: 1,
              thisMonth: thisMonth ? 1 : 0,
              lastMonth: lastMonth ? 1 : 0
            };
          }
        }

        resolve(visits);
      });
    });
  }

  /**
   * Initialize the array of stakeholder platforms
   * @returns {Promise<any>}
   */
  private initPlatforms(): Promise<any> {
    return new Promise(resolve => {
      this.firebaseSvc.getAllStakeholderPlatforms().subscribe(plats => {

        for (let i = 0; i < plats.length; i++) {
          this.firebaseSvc.getStakeholderPlatforms(plats[i].$key).subscribe(platformList => {
            this.platformList = this.platformList.concat(platformList);

            for (let k = 0; k < platformList.length; k++) {
              let d = new Date(platformList[k].meetingDate);

              // See if the visit happened this month
              let thisMonth: boolean = d.getMonth() === this.currentMonth && d.getFullYear() === this.currentYear;
              // See if the visit happened last month
              let lastMonth: boolean = d.getMonth() + 1 === this.currentMonth && d.getFullYear() === this.currentYear;

              // Take care of the fringe cases when it's currently january and the visit occurred in december
              if (d.getMonth() === 11) {
                lastMonth = this.currentMonth === 0 && d.getFullYear() === this.currentYear - 1;
              }

              // Increment the overall tracker for visits occurring this month
              if (thisMonth) {
                this.platformsThisMonth++;
              }

              if (lastMonth) {
                this.platformsLastMonth++;
              }

              // Build the district-specific hashtable
              if (platformList[k].district) {
                // Make sure to see if district exists - it wasn't collected in the app prior to 12/18/17
                let district = platformList[k].district;
                if (this.platformsByDist[district]) {
                  this.platformsByDist[district].total++;
                  if (thisMonth) {
                    this.platformsByDist[district].thisMonth++;
                  }
                  if (lastMonth) {
                    this.platformsByDist[district].lastMonth++;
                  }
                } else {
                  this.platformsByDist[district] = {
                    total: 1,
                    thisMonth: thisMonth ? 1 : 0,
                    lastMonth: lastMonth ? 1 : 0
                  };
                }
              }

            }
          });
        }

        resolve(plats);
      });
    });
  }

  private initContacts(): Promise<any> {
    return new Promise(resolve => {

      // Inititalize the contact by district object for all districts
      for (let i = 0; i < this.districtList.length; i++) {
        this.contactsByDistrict[this.districtList[i]] = {
          total: 0,
          farmers: 0
        };
      }

      this.firebaseSvc.getContacts().subscribe(contactList => {
        // Initial iteration through each users contact list object
        let cByD = this.contactsByDistrict;
        for (let i = 0; i < contactList.length; i++) {
          let contacts = contactList[i];
          Object.keys(contacts).forEach(function (key) {
            let contact = contacts[key];
            if (cByD[contact.district]) {
              cByD[contact.district].total++;
            } else {
              cByD[contact.district] = {
                total: 1,
                farmers: 0
              };
            }
            if (contact.contactType.toLowerCase() === 'farmer/producer') {
              cByD[contact.district].farmers++;
            }
          });

          this.contactsByDistrict = cByD;
          resolve();
        }
      });
    });
  }

  private initDistricts(): Promise<any> {
    return new Promise(resolve => {
      let list = [];
      this.firebaseSvc.getAllDistricts().subscribe(dist => {
        if (dist && dist.length > 0) {
          for (let i = 0; i < dist.length; i++) {
            list.push(dist[i].name);
          }
          this.districtList = list;
          resolve();
        }
      });
    });
  }

  /**
   * This method will create a combined object showing the interactions by district
   * @returns {{}}
   */
  private getCombinedInteractions() {
    let indiv = this.individualVisitsByDist;
    let group = this.groupVisitsByDist;
    let platform = this.platformsByDist;
    let combined = {};

    Object.keys(this.individualVisitsByDist).forEach(function (key) {
      // Add it to the combined object if needed
      if (!combined[key]) {
        combined[key] = indiv[key];
      } else {
        // Otherwise, add the values
        combined[key].total += indiv[key].total;
        combined[key].thisMonth += indiv[key].thisMonth;
        combined[key].lastMonth += indiv[key].lastMonth;
      }
    });

    Object.keys(this.groupVisitsByDist).forEach(function (key) {
      // Add it to the combined object if needed
      if (!combined[key]) {
        combined[key] = group[key];
      } else {
        // Otherwise, add the values
        combined[key].total += group[key].total;
        combined[key].thisMonth += group[key].thisMonth;
        combined[key].lastMonth += group[key].lastMonth;
      }
    });

    Object.keys(this.platformsByDist).forEach(function (key) {
      // Add it to the combined object if needed
      if (!combined[key]) {
        combined[key] = platform[key];
      } else {
        // Otherwise, add the values
        combined[key].total += platform[key].total;
        combined[key].thisMonth += platform[key].thisMonth;
        combined[key].lastMonth += platform[key].lastMonth;
      }
    });

    return combined;
  }

  /**
   * Used to initialize the firebase objects we'll be working with.  Required before using this service's other methods.
   * @returns {Promise<any>}
   */
  public init(): Promise<any> {
    return new Promise(resolve => {

      this.initDistricts().then(() => {
        Observable.forkJoin([this.initIndividual(), this.initGroup(), this.initPlatforms(), this.initContacts()])
          .subscribe((result) => {
            this.individualVisitList = result[0];
            this.groupVisitList = result[1];
            this.platformList = result[2];

            this.hasInitialized = true;

            resolve();
          });
      });
    });
  }


  /**
   * Returns the number of individual farm visits in the database
   * @returns {number}
   */
  public getIndividualVisitStats(district?: string) {
    if (!district) {
      return {
        total: this.individualVisitList && this.individualVisitList.length ? this.individualVisitList.length : 0,
        thisMonth: this.individualVisitsThisMonth,
        lastMonth: this.individualVisitsLastMonth
      };
    } else {
      if (this.individualVisitsByDist.hasOwnProperty(district)) {
        return this.individualVisitsByDist[district];
      } else {
        return {
          total: 0,
          thisMonth: 0,
          lastMonth: 0
        };
      }
    }
  }

  /**
   * Returns the number of group farm visits in the database
   * @returns {number}
   */
  public getGroupVisitStats(district?: string) {
    if (!district) {
      return {
        total: this.groupVisitList && this.groupVisitList.length ? this.groupVisitList.length : 0,
        thisMonth: this.groupVisitsThisMonth,
        lastMonth: this.groupVisitsLastMonth
      };
    } else {
      if (this.groupVisitsByDist.hasOwnProperty(district)) {
        return this.groupVisitsByDist[district];
      } else {
        return {
          total: 0,
          thisMonth: 0,
          lastMonth: 0
        };
      }
    }
  }

  /**
   * Returns the number of platform for the given district.  If no district is specified, returns the national count.
   * @param {string} district - optional
   * @returns {number}
   */
  public getPlatformStats(district?: string) {
    if (!district) {
      return {
        total: this.platformList.length,
        thisMonth: this.platformsThisMonth,
        lastMonth: this.platformsLastMonth
      };
    } else {
      if (this.platformsByDist.hasOwnProperty(district)) {
        return this.platformsByDist[district];
      } else {
        return {
          total: 0,
          thisMonth: 0,
          lastMonth: 0
        };
      }
    }
  }

  /**
   * Return a list of all districts that have some statistics to display
   * @returns {string[]}
   */
  public getDistrictsWithStats() {
    let districtList: string[] = [];

    Object.keys(this.individualVisitsByDist).forEach(function (key) {
      if (districtList.indexOf(key) === -1) {
        districtList.push(key);
      }
    });

    Object.keys(this.contactsByDistrict).forEach(function (key) {
      if (districtList.indexOf(key) === -1) {
        districtList.push(key);
      }
    });

    return districtList.sort();
  }

  public getContactStats() {
    return this.contactsByDistrict;
  }

  public getInteractionCountByDistrict(): any {
    let combined = this.getCombinedInteractions();
    let returnObject = {
      lifetime: {
        labels: [],
        values: []
      },
      thisMonth: {
        labels: [],
        values: []
      },
      lastMonth: {
        labels: [],
        values: []
      }
    };
    let labelArray: string[] = [];

    // Create the label array with each district name, ensuring each is added only once
    Object.keys(combined).forEach(function (key) {
      if (labelArray.indexOf(key) === -1) {
        labelArray.push(key);
      }
    });

    // Set the labels for the return object
    returnObject.lifetime.labels = labelArray;
    returnObject.lastMonth.labels = labelArray;
    returnObject.thisMonth.labels = labelArray;

    // Initialize the value arrays
    let valueArrayLifetime: number[] = [labelArray.length];
    let valueArrayThisMonth: number[] = [labelArray.length];
    let valueArrayLastMonth: number[] = [labelArray.length];

    for (let i = 0; i < labelArray.length; i++) {
      valueArrayLifetime[i] = combined[labelArray[i]].total;
      valueArrayLastMonth[i] = combined[labelArray[i]].lastMonth;
      valueArrayThisMonth[i] = combined[labelArray[i]].thisMonth;
    }

    // Set the values for the return object
    returnObject.lifetime.values = valueArrayLifetime;
    returnObject.lastMonth.values = valueArrayLastMonth;
    returnObject.thisMonth.values = valueArrayThisMonth;

    return returnObject
  }

  /**
   * Returns a list of extension workers assigned to the given district
   * @param districtName
   * @returns {Promise<any>}
   */
  public getExtensionWorkersForDistrict(districtName): Promise<any> {
    return new Promise(resolve => {
      this.firebaseSvc.getExtensionWorkersByDistrict(districtName).then(list => {
        if (!this.extensionWorkerDistrictList[districtName]) {
          this.extensionWorkerDistrictList[districtName] = list;
        }
        resolve(list);
      });
    });
  }

  public getProgressForDistrict(districtName) {
    return new Promise(resolve => {
      let goals = {
        individualProgress: 0,
        individualGoal: 0,
        groupProgress: 0,
        groupGoal: 0,
        platformProgress: 0,
        platformGoal: 0
      };

      // Use the cached extension worker list
      if (this.extensionWorkerDistrictList[districtName]) {
        let list = this.extensionWorkerDistrictList[districtName];
        // Calculate the progress towards goals
        let promiseList = [];

        for (let i = 0; i < list.length; i++) {
          // Increment the overall goals (with defaults in case the ext worker's manager hasn't yet specified a goal)
          goals.individualGoal += list[i].individualGoal || 10;
          goals.groupGoal += list[i].groupGoal || 10;
          goals.platformGoal += list.platformGoal || 2;

          // Count the number of individual farm visits this month
          promiseList.push(this.incrementIndividualProgress(districtName, list[i].email).then(amountToIncrease => {
            goals.individualProgress += amountToIncrease;
          }));

          // Count the number of group farm visits this month
          promiseList.push(this.incrementGroupProgress(districtName, list[i].email).then(amount => {
            goals.groupProgress += amount;
          }));

          // Count the number of stakeholder platforms this month
          promiseList.push(this.incrementPlatformProgress(districtName, list[i].$key, list[i].email).then(amount => {
            goals.platformProgress += amount;
          }));
        }
        // Use Promise.all so that goals isn't returned before our promises finish
        Observable.forkJoin(promiseList).subscribe(() => {
          resolve(goals);
        });
      } else {
        this.getExtensionWorkersForDistrict(districtName).then(() => {
          resolve(this.getProgressForDistrict(districtName));
        });
      }
    });
  }

  /**
   * Return a hashtable with all districts and their number of assigned extension workers
   */
  public getExtWorkerByDistrictCount() {
    return new Promise(resolve => {
      let districtList = [];
      let hashTable = {};

      // First get all districts
      for (let i = 0; i < this.districtList.length; i++) {
        if (this.districtList[i].name) {
          // Add it to the list
          districtList.push(this.districtList[i].name);

          // Add it to the hashtable
          hashTable[this.districtList[i].name] = 0;
        }
      }

      // Now get all extension workers and increment the hashtable
      this.firebaseSvc.getExtensionWorkerList().subscribe(extWorker => {
        if (extWorker && extWorker.length > 0) {
          for (let i = 0; i < extWorker.length; i++) {
            if (extWorker[i].district) {
              if (hashTable[extWorker[i].district]) {
                hashTable[extWorker[i].district]++;
              } else {
                hashTable[extWorker[i].district] = 1;
              }
            }
          }

          resolve(hashTable);
        }
      });

    });
  }

  public getAllDistricts() {
    return this.districtList;
  }

  /**
   * Wrapper that calls the firebase service to retrieve all visits that occurred during the current month
   * @returns {Promise<any>}
   */
  public getAllVisitsThisMonth() {
    return new Promise(resolve => {
      let individualVisits = [];
      let groupVisits = [];
      let platforms = [];

      let p1 = this.firebaseSvc.getAllIndividualFarmVisits().subscribe(visits => {
        for (let i = 0; i < visits.length; i++) {
          let visitDate = new Date(visits[i].visitInformation.visitDate);
          if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
            individualVisits.push(visits[i]);
          }
        }
      });

      let p2 = this.firebaseSvc.getAllGroupFarmVisits().subscribe(visits => {
        for (let i = 0; i < visits.length; i++) {
          let visitDate = new Date(visits[i].visitInformation.visitDate);
          if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
            groupVisits.push(visits[i]);
          }
        }
      });

      let p3 = this.firebaseSvc.getAllStakeholderPlatforms().subscribe(visits => {
        for (let i = 0; i < visits.length; i++) {
          let visitDate = new Date(visits[i].meetingDate);
          if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
            platforms.push(visits[i]);
          }
        }
      });

      Promise.all([p1, p2, p3]).then(() => {
        resolve([individualVisits, groupVisits, platforms]);
      });
    });
  }

  public getAllVisitsLastMonth() {
    return new Promise(resolve => {
      let individualVisits = [];
      let groupVisits = [];
      let platforms = [];

      let p1 = this.firebaseSvc.getAllIndividualFarmVisits().subscribe(visits => {
        for (let i = 0; i < visits.length; i++) {
          let visitDate = new Date(visits[i].visitInformation.visitDate);

          if (this.currentMonth === 0) {
            // Go back to December of last year if it's currently January
            if (visitDate.getMonth() === 11 && visitDate.getFullYear() === this.currentYear - 1) {
              individualVisits.push(visits[i]);
            }
          } else {
            if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
              individualVisits.push(visits[i]);
            }
          }
        }
      });

      let p2 = this.firebaseSvc.getAllGroupFarmVisits().subscribe(visits => {
        for (let i = 0; i < visits.length; i++) {
          let visitDate = new Date(visits[i].visitInformation.visitDate);
          if (this.currentMonth === 0) {
            // Go back to December of last year if it's currently January
            if (visitDate.getMonth() === 11 && visitDate.getFullYear() === this.currentYear - 1) {
              groupVisits.push(visits[i]);
            }
          } else {
            if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
              groupVisits.push(visits[i]);
            }
          }
        }
      });

      let p3 = this.firebaseSvc.getAllStakeholderPlatforms().subscribe(visits => {
        for (let i = 0; i < visits.length; i++) {
          let visitDate = new Date(visits[i].meetingDate);
          if (this.currentMonth === 0) {
            // Go back to December of last year if it's currently January
            if (visitDate.getMonth() === 11 && visitDate.getFullYear() === this.currentYear - 1) {
              platforms.push(visits[i]);
            }
          } else {
            if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
              platforms.push(visits[i]);
            }
          }
        }
      });

      Promise.all([p1, p2, p3]).then(() => {
        resolve([individualVisits, groupVisits, platforms]);
      });
    });
  }

  private incrementIndividualProgress(district, email): Promise<number> {
    return new Promise(resolve => {
      let goal = 0;
      this.firebaseSvc.getIndividualFarmVisits(email).subscribe(visits => {
        if (visits && visits.length > 0) {
          for (let k = 0; k < visits.length; k++) {
            let visitDate = new Date(visits[k].visitInformation.visitDate);
            if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
              goal++;
              // Initialize the hash table with the district
              if (!this.districtVisitsTMIndiv[district]) {
                this.districtVisitsTMIndiv[district] = [];
              }
              this.districtVisitsTMIndiv[district].push(visits[k]);
            }
          }
        }
        resolve(goal);
      });
    });
  }

  private incrementGroupProgress(district, email): Promise<number> {
    return new Promise(resolve => {
      let goal = 0;
      this.firebaseSvc.getGroupFarmVisits(email).subscribe(visits => {
        if (visits && visits.length > 0) {
          for (let k = 0; k < visits.length; k++) {
            let visitDate = new Date(visits[k].visitInformation.visitDate);
            if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
              goal++;
              // Initialize the hash table with the district
              if (!this.districtVisitsTMGroup[district]) {
                this.districtVisitsTMGroup[district] = [];
              }
              this.districtVisitsTMGroup[district].push(visits[k]);
            }
          }
        }
        resolve(goal);
      });
    });
  }

  private incrementPlatformProgress(district, id, email): Promise<number> {
    return new Promise(resolve => {
      let goal = 0;
      this.firebaseSvc.getStakeholderPlatforms(id).subscribe((visits: any) => {
        if (visits && visits.length > 0) {
          for (let k = 0; k < visits.length; k++) {
            let visitDate = new Date(visits[k].meetingDate);
            if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
              goal++;
              // Initialize the hash table with the district
              if (!this.districtVisitsTMPlatform[district]) {
                this.districtVisitsTMPlatform[district] = [];
              }
              this.districtVisitsTMPlatform[district].push(visits[k]);
            }
          }
        }
        resolve(goal);
      });
    });
  }

  public getDistrictVisitsThisMonth() {
    return new Promise(resolve => {
      resolve([this.districtVisitsTMIndiv, this.districtVisitsTMGroup, this.districtVisitsTMPlatform]);
    });
  }

  /**
   * Get the progress towards goals for an individual extension worker
   * @param email
   * @param key
   */
  public getProgress(email, key) {
    return new Promise(resolve => {
      // The object we will build and ultimately return
      let progress = {
        individualGoal: 10,
        groupGoal: 10,
        platformGoal: 2,
        individualProgress: 0,
        groupProgress: 0,
        platformProgress: 0
      };

      // get the user object for the extension worker so that we can see their goals
      this.firebaseSvc.getUser(email).subscribe((user: any) => {
        progress.individualGoal = user.individualGoal || 10;
        progress.groupGoal = user.groupGoal || 10;
        progress.platformGoal = user.platformGoal || 2;

        // Filter the visit list to just the visits by this extension worker
        let visitList = this.individualVisitList.filter(x => x.email === email);

        // Loop through the visits to increment the individual progress
        for (let i = 0; i < visitList.length; i++) {
          let visitDate = new Date(visitList[i].visitInformation.visitDate);

          if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
            progress.individualProgress++;
          }
        }


        // Now do the same thing for group visits
        let groupVisits = this.groupVisitList.filter(x => x.email === email);

        for (let i = 0; i < groupVisits.length; i++) {
          let visitDate = new Date(groupVisits[i].visitInformation.visitDate);

          if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
            progress.groupProgress++;
          }
        }

        // Finally, do the same thing for platforms
        let platforms = this.platformList.filter(x => x.$key === key);

        if (platforms && platforms.length === 1) {
          // given the nature of how stakeholder platforms are arranged, this will come back with an object at index 0
          // that's what we'll need to iterate through
          let plats = platforms[0];
          let currentMonth = this.currentMonth;
          let currentYear = this.currentYear;

          Object.keys(plats).forEach(function (index) {
            let plat = plats[index];
            let visitDate = new Date(plat.meetingDate);
            if (visitDate.getMonth() === currentMonth && visitDate.getFullYear() === currentYear) {
              progress.platformProgress++;
            }
          });

          /*for (let i = 0; i < platforms[0].length; i++) {
            let visitDate = new Date(platforms[0][i].meetingDate);

            if (visitDate.getMonth() === this.currentMonth && visitDate.getFullYear() === this.currentYear) {
              progress.groupProgress++;
            }
          }*/
        }

        // Then resolve the progress object
        resolve(progress);

      });

    });
  }

}
