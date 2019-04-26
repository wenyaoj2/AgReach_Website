import {Component, OnInit} from '@angular/core';
import {FirebaseService} from '../../services/firebase.service';
import {NgxChartsModule} from '@swimlane/ngx-charts';
import {UserService} from "../../services/user.service";

@Component({
  selector: 'app-farmers',
  templateUrl: './farmers.component.html',
  styleUrls: ['./farmers.component.css']
})
export class FarmersComponent implements OnInit {
  farmerList: any;
  farmerCount = 0;
  extensionWorkerCount = 0;

  sortType = 'contactName';
  sortDesc = false;

  // options for the bar chart
  districtHashTable = {};
  districtResults = [];
  view: any[] = [500, 200];
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = false;
  showXAxisLabel = true;
  xAxisLabel = 'District';
  showYAxisLabel = true;
  yAxisLabel = 'Number of Farmers';
  colorScheme = {
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA']
  };

  constructor(private firebaseService: FirebaseService, private userService: UserService) {
    this.userService.init();
  }

  ngOnInit() {
    this.farmerList = [];

    this.getContacts().then(contactList => {
      if (contactList && contactList.length > 0) {
        this.farmerCount = contactList.length;
        this.farmerList = contactList;

        // Load the extension workers, then apply a default sort
        this.loadExtensionWorkers().then(() => {
          this.sort('contactName');
        });

        this.compileDistricts();
      } else {
        this.farmerCount = 0;
      }
    });
  }

  /**
   * Helper method to fully load the extension workers for each contact object before we try sorting
   * @returns {Promise<any>}
   */
  loadExtensionWorkers() {
    return new Promise(resolve => {
      let promiseList = [];
      // Loop through the farmer list and associate the extension worker's guid with their name/email
      for (let i = 0; i < this.farmerList.length; i++) {
        promiseList.push(this.userService.getUserByKey(this.farmerList[i].extensionWorker).then((worker: any) => {
          // Use the extension worker's name, if available, or else their email
          this.farmerList[i].extensionWorker = worker;
        }));
      }
      Promise.all(promiseList).then(() => {
        resolve();
      })
    });
  }

  /**
   * Sort!
   * @param sortType
   */
  sort(sortType) {
    if (this.sortType === sortType) {
      this.sortDesc = !this.sortDesc;
    }
    this.sortType = sortType;

    let direction = this.sortDesc ? 1 : -1;
    this.farmerList.sort(function (a, b) {
      // Special use case when sorting by extension worker.
      if (sortType === 'extensionWorker') {
        let aSort = a.extensionWorker.fullName || a.extensionWorker.email;
        let bSort = b.extensionWorker.fullName || b.extensionWorker.email;

        if (aSort < bSort) {
          return -1 * direction;
        } else if (aSort > bSort) {
          return direction;
        } else {
          return 0;
        }
      } else {
        if (a[sortType] < b[sortType]) {
          return -1 * direction;
        } else if (a[sortType] > b[sortType]) {
          return direction;
        } else {
          return 0;
        }
      }
    });

  }

  /**
   * Generate the bar chart information showing contacts by district
   */
  compileDistricts() {
    this.districtHashTable = {};
    for (let i = 0; i < this.farmerList.length; i++) {
      const district = this.farmerList[i].district;
      if (this.districtHashTable.hasOwnProperty(district)) {
        this.districtHashTable[district]++;
      } else {
        this.districtHashTable[district] = 1;
      }
    }

    const tempHash = this.districtHashTable;
    let tempResults = [];

    Object.keys(tempHash).forEach(function (key) {
      let district = tempHash[key];
      tempResults.push({
        'name': key.toString(),
        'value': tempHash[key]
      });
    });
    tempResults.sort(function (a, b) {
      if (a['name'] < b['name']) {
        return -1;
      } else if (a['name'] > b['name']) {
        return 1;
      } else {
        return 0;
      }
    });
    this.districtResults = tempResults;

    // const ctx = document.getElementById('districtPieChart');
    // const districtPie = new Chart(ctx, {});
  }

  getContacts(): Promise<any[]> {
    return new Promise(resolve => {
      const contactList = [];

      this.firebaseService.getContacts().subscribe(extWorker => {

        if (extWorker && extWorker.length) {
          this.extensionWorkerCount = extWorker.length;

          for (let i = 0; i < extWorker.length; i++) {
            // Loop through all extension workers and grab each contact object
            this.firebaseService.getIndividualContact(extWorker[i].$key).subscribe(contacts => {
              for (let k = 0; k < contacts.length; k++) {

                // Add the guid for the extension worker to the contact object so we can show which ext worker added each contact
                contacts[k].extensionWorker = extWorker[i].$key;

                // Add the contact to the list only if it's a farmer
                if (contacts[k].contactType.toLowerCase() === 'farmer/producer') {
                  contactList.push(contacts[k]);
                }
              }
            });

            resolve(contactList);
          }
        }
      });
    });
  }

}
