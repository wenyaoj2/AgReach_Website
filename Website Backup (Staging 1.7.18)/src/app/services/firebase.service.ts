import {Injectable} from '@angular/core';
import {AngularFireDatabase, FirebaseListObservable, FirebaseObjectObservable} from 'angularfire2/database-deprecated';
import * as firebase from 'firebase';
import {FirebaseApp} from 'angularfire2';
import 'rxjs/add/observable/forkJoin';

@Injectable()
export class FirebaseService {
  contacts: FirebaseListObservable<any[]>;
  updateFarmer: FirebaseListObservable<any[]>;
  viewUser: FirebaseObjectObservable<any>;
  viewNewUser: FirebaseListObservable<any[]>;
  updateUserStatus: FirebaseListObservable<any[]>;
  groupVisit: FirebaseListObservable<any[]>;
  viewGroupDetails: FirebaseObjectObservable<any>;
  updateUserTable: FirebaseListObservable<any[]>;
  viewUsers: FirebaseListObservable<any[]>;
  userLoginDetails: FirebaseListObservable<any[]>;
  resources: FirebaseListObservable<any[]>;
  updateResourceTable: FirebaseListObservable<any[]>;
  extensionWorkerList: FirebaseListObservable<any[]>;
  meetingDetails: FirebaseListObservable<any[]>;
  extensionWorkerRole: FirebaseListObservable<any[]>;
  viewIndividualLocation: FirebaseListObservable<any[]>;
  viewGroupLocation: FirebaseListObservable<any[]>;
  viewFarmers: FirebaseListObservable<any[]>;
  individualFarmVisits: FirebaseListObservable<any[]>;
  groupFarmVisits: FirebaseListObservable<any[]>;
  updateUsers: FirebaseListObservable<any[]>;

  folder: any;
  selectedFile: any;
  // iRef: any;
  storageRef: any;
  downloadUrl: any;

  constructor(private db: AngularFireDatabase, private firebaseApp: FirebaseApp) {
    this.folder = 'resources';
  }

  /*getExtensionWorkers() {
    this.extensionWorkers = this.db.list('/individualFarmVisit') as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.extensionWorkers;
  }*/

  getContacts() {
    return this.db.list('/contacts') as FirebaseListObservable<any[]>;
  }

  getIndividualContact(id) {
    return this.db.list('/contacts/' + id) as FirebaseListObservable<any[]>;
  }

  getContactByGuid(guid) {
    return new Promise(resolve => {
      this.db.list('/contacts/').subscribe(userContacts => {
        for (let i = 0; i < userContacts.length; i++) {
          this.db.list('/contacts/' + userContacts[i].$key).subscribe(contacts => {
            let contact = contacts.find(x => x.guid === guid);
            if (contact) {
              resolve(contact);
            }
          });
        }
      });
    });
  }

  getUserDetails(id) {
    this.viewUser = this.db.object('/individualFarmVisit/' + id) as FirebaseObjectObservable<ExtensionWorkerList>;
    return this.viewUser;
  }

  getAllIndividualFarmVisits() {
    return this.db.list('/individualFarmVisit/');
  }

  getAllGroupFarmVisits() {
    return this.db.list('/groupFarmVisit/');
  }

  getAllStakeholderPlatforms() {
    return this.db.list('/stakeholderPlatform');
  }

  getPlatformsForFarmer(guid) {
    return new Promise(resolve => {
      let records = [];
      let platformList = this.db.list('/stakeholderPlatform') as FirebaseListObservable<ExtensionWorkerList[]>;

      /* This is unfortunately needlessly complicated due to improper FireBase Database layout.  Sorry about that.
       * Due to multi-level DB format, we have to first subscribe to the whole stakeholderPlatform table
       * Then we subscribe to the platforms of each extension worker, and finally iterate
       * through the individual stakeholder platform records to find those containing the guid of the farmer in question */
      platformList.subscribe(platforms => {
          for (let i = 0; i < platforms.length; i++) {
            let extWorkerPlatforms = this.db.list('/stakeholderPlatform/' + platforms[i].$key);
            extWorkerPlatforms.subscribe(individualPlatform => {
              if (individualPlatform && individualPlatform.length && individualPlatform.length > 0) {
                for (let k = 0; k < individualPlatform.length; k++) {
                  const attendees = individualPlatform[k].attendeeRoles;
                  for (let z = 0; z < attendees.length; z++) {
                    if (attendees[z].guid === guid) {
                      records.push(individualPlatform[k]);
                      break;
                    }
                  }
                }
              }
            });
          }
          resolve(records);
        }
      )
      ;
    });
  }


  updateFarmerInformation(id, editDetails) {
    this.updateFarmer = this.db.list('/individualFarmVisit/' + id) as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.updateFarmer.update('farmerInformation', editDetails);
  }

  /*addNewUser(newDetail) {
      // Create root reference
      let storageRef = firebase.storage().ref();
      for(let selectedFile of [(<HTMLInputElement>document.getElementById('uploaddocument')).files[0]]) {
          let path = `/${this.folder}/$selectedFile.name}`;
          let iRef = storageRef.child(path);
          iRef.put(selectedFile).then((snapshot) => {
              newDetail.uploaddocument = selectedFile.name;
              newDetail.path = path;
              return this.extensionWorkers.push(newDetail);
          });
      }
  }*/

  uploadDocument(newDocument) {
    // Create root reference
    this.storageRef = firebase.storage().ref();
    for (let selectedFile of [(<HTMLInputElement>document.getElementById('uploaddocument')).files[0]]) {
      let path = `/${this.folder}/` + selectedFile.name;
      let iRef = this.storageRef.child(path);
      let size = selectedFile.size;
      iRef.getDownloadURL().then(function (url) {
        console.log(url);
        // newDocument.downloadUrl = url;
        let xhr = new XMLHttpRequest();
        xhr.responseType = 'blob';
        xhr.onload = function (event) {
          let blob = xhr.response;
        };
        xhr.open('GET', url);
        xhr.send();

        // Or inserted into an <img> element:
        newDocument.downloadUrl = url;
      }).catch(function (error) {

        // A full list of error codes is available at
        // https://firebase.google.com/docs/storage/web/handle-errors
        switch (error.code) {
          case 'storage/object_not_found':
            // File doesn't exist
            break;

          case 'storage/unauthorized':
            // User doesn't have permission to access the object
            break;

          case 'storage/canceled':
            // User canceled the upload
            break;

          case 'storage/unknown':
            // Unknown error occurred, inspect the server response
            break;
        }
      });
      iRef.put(selectedFile).then((snapshot) => {
        // newDocument.downloadUrl = path;
        newDocument.fileName = selectedFile.name;
        newDocument.size = size;
        newDocument.downloadUrl = newDocument.downloadUrl;
        this.updateResourceTable = this.db.list('/resources') as FirebaseListObservable<ExtensionWorkerList[]>;
        return this.updateResourceTable.push(newDocument);
      });
    }
  }

  getNewUser() {
    this.viewNewUser = this.db.list('/users') as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.viewNewUser;
  }

  updateStatus(id, changeStatus) {
    this.updateUserStatus = this.db.list('/users') as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.updateUserStatus.update(id, changeStatus);
  }

  updateUser(id, value: any) {
    this.updateUsers = this.db.list('/users') as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.updateUsers.update(id, value);
  }

  getGroupVisit() {
    this.groupVisit = this.db.list('/groupFarmVisit') as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.groupVisit;
  }

  getGroupDetails(id) {
    this.viewGroupDetails = this.db.object('/groupFarmVisit/' + id) as FirebaseObjectObservable<ExtensionWorkerList>;
    return this.viewGroupDetails;
  }

  insertUser(newUser) {
    this.updateUserTable = this.db.list('/users') as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.updateUserTable.push(newUser);
  }

  getUsers() {
    this.viewUsers = this.db.list('/users') as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.viewUsers;
  }

  getUserObject(id) {
    return this.db.object('/users/' + id) as FirebaseObjectObservable<any>;
  }

  /**
   * Return all invitations in the database
   * @returns {FirebaseListObservable<any[]>}
   */
  getInvitations() {
    return this.db.list('/invitation');
  }

  getManagers() {
    return this.db.list('/users', {
      query: {
        orderByChild: 'role',
        equalTo: 'Manager'
      }
    });
  }

  /**
   * Retrieve all districts within the given country.  If no country is specified, it will default to Malawi.
   * @param country
   * @returns {FirebaseListObservable<any[]>}
   */
  getDistricts(country?) {
    return this.db.list('/districts', {
      query: {
        orderByChild: 'country',
        equalTo: country || 'Malawi'
      }
    });
  }

  /**
   * Returns all subordinates for the given user
   * @param email
   * @returns {FirebaseListObservable<any[]>}
   */
  getSubordinates(email) {
    return this.db.list('/users', {
      query: {
        orderByChild: 'manager',
        equalTo: email
      }
    });
  }

  getGroup(guid) {
    return new Promise(resolve => {
      this.getGroups().then((groups: any) => {
        for (let i = 0; i < groups.length; i++) {
          if (groups[i].guid === guid) {
            resolve(groups[i]);
          }
        }
        resolve();
      });
    });
  }

  getGroups() {
    return new Promise(resolve => {
      let groupList = [];

      this.db.list('/groups/').subscribe(userGroups => {
        if (userGroups && userGroups.length > 0) {
          for (let i = 0; i < userGroups.length; i++) {
            let key = userGroups[i].$key;
            this.db.list('/groups/' + userGroups[i].$key).subscribe(group => {
              for (let k = 0; k < group.length; k++) {
                group[k].extensionWorkerKey = key;
                groupList.push(group[k]);
              }
            });
          }

          resolve(groupList);
        }
      });
    });
  }

  getSubordinateGroups(email) {
    return new Promise(resolve => {
      this.db.list('/users', {
        query: {
          orderByChild: 'manager',
          equalTo: email
        }
      }).subscribe(subordinates => {
        let groupList = [];
        let promiseList = [];

        for (let i = 0; i < subordinates.length; i++) {
          /*let list = this.db.list('/groups/' + );
          let newPromise = list.subscribe(groups => {
            groupList = groupList.concat(groups);
          });*/
          let newPromise = this.getGroupsForUser(subordinates[i].$key).then(groups => {
            groupList = groupList.concat(groups);
          });
          promiseList.push(newPromise);
        }
        Promise.all(promiseList).then(() => {
          resolve(groupList);
        });

      });
    });
  }

  getGroupsForUser(key) {
    return new Promise(resolve => {
      this.db.object('/users/' + key).subscribe(user => {
        this.db.list('/groups/' + key).subscribe(groups => {
          for (let i = 0; i < groups.length; i++) {
            let group = groups[i];
            group.extensionWorkerEmail = user.email;
            group.extensionWorkerKey = key;
            if (user.fullName) {
              group.extensionWorkerName = user.fullName;
            }
          }
          resolve(groups);
        });
      });
    });
  }

  getUser(email) {
    return this.db.list('/users/', {
      query: {
        orderByChild: 'email',
        equalTo: email
      }
    });
  }

  getResources() {
    this.resources = this.db.list('/resources') as FirebaseListObservable<any>;
    return this.resources;
  }

  addResource(newResource) {
    this.resources = this.db.list('/resources') as FirebaseListObservable<any>;
    return this.resources.push(newResource);
  }

  deleteResource(resource) {
    this.resources = this.db.list('/resources') as FirebaseListObservable<any>;
    return this.resources.remove(resource.$key);
  }

  getExtensionWorkerList() {
    this.extensionWorkerList = this.db.list('/users', {
      query: {
        orderByChild: 'role',
        equalTo: 'Extension Worker'
      }
    }) as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.extensionWorkerList;
  }

  /**
   * Return all extension workers assigned to the given district
   * @param districtName
   * @returns {Promise<any>}
   */
  public getExtensionWorkersByDistrict(districtName) {
    return new Promise(resolve => {
      let districtList = [];
      this.getExtensionWorkerList().subscribe(extWorkerList => {
        if (extWorkerList && extWorkerList.length > 0) {
          for (let i = 0; i < extWorkerList.length; i++) {
            if (extWorkerList[i].district && extWorkerList[i].district === districtName) {
              districtList.push(extWorkerList[i]);
            }
          }
        }
        resolve(districtList);
      });
    });
  }

  getExtensionWorkerLocations(id) {
    return this.db.list('/locations/' + id) as FirebaseListObservable<any>;
  }

  /**
   * Return all districts
   * @returns {FirebaseListObservable<any[]>}
   */
  getAllDistricts() {
    return this.db.list('/districts');
  }

  getMeetingDetails(id) {
    this.meetingDetails = this.db.list('/stakeholderPlatform/' + id) as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.meetingDetails;
  }

  getExtensionUserRole(email) {
    this.extensionWorkerRole = this.db.list('/users', {
      query: {
        orderByChild: 'email',
        equalTo: email
      }
    }) as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.extensionWorkerRole;
  }

  getPlatformMinutesAttachment(key) {
    return new Promise((resolve, reject) => {
      const storageRef = this.firebaseApp.storage().ref().child('/platformAttachments/' + key + '/minutes.png');
      storageRef.getDownloadURL().then(url => {
        resolve(url);
      }).catch(err => {
        reject(err);
      })
    });
  }

  getPlatformAttendeeListAttachment(key) {
    return new Promise((resolve, reject) => {
      const storageRef = this.firebaseApp.storage().ref().child('/platformAttachments/' + key + '/attendees.png');
      storageRef.getDownloadURL().then(url => {
        resolve(url);
      }).catch(err => {
        reject(err);
      })
    });
  }

  getIndividualFarmVisitLocation(email) {
    this.viewIndividualLocation = this.db.list('/individualFarmVisit', {
      query: {
        orderByChild: 'email',
        equalTo: email
      }
    }) as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.viewIndividualLocation;
  }

  getGroupFarmVisits(email) {
    this.viewGroupLocation = this.db.list('/groupFarmVisit', {
      query: {
        orderByChild: 'email',
        equalTo: email
      }
    }) as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.viewGroupLocation;
  }

  /**
   * Get all stakeholder platforms for the given extension worker
   * @param id - The Firebase UID of the extension worker
   * @returns {FirebaseListObservable<any[]>}
   */
  getStakeholderPlatforms(id) {
    return this.db.list('/stakeholderPlatform/' + id);
  }

  getStakeholderPlatformsByEmail(email) {
    return new Promise(resolve => {
      this.getUser(email).subscribe(user => {
        if (user.length === 1) {
          let id = user[0].$key;
          this.getStakeholderPlatforms(id).subscribe(plats => {
            resolve(plats);
          });
        }
      });
    });
  }

  getIndividualFarmVisits(email) {
    this.individualFarmVisits = this.db.list('/individualFarmVisit', {
      query: {
        orderByChild: 'email',
        equalTo: email
      }
    }) as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.individualFarmVisits;
  }

  getIndividualGroupVisits(email) {
    this.groupFarmVisits = this.db.list('/groupFarmVisit', {
      query: {
        orderByChild: 'email',
        equalTo: email
      }
    }) as FirebaseListObservable<ExtensionWorkerList[]>;
    return this.groupFarmVisits;
  }
}

interface ExtensionWorkerList {
  $key?: string;
  name?: string;
  age?: string;
  district?: string;
  educationLevel?: string;
  gender?: string;
  membership?: string;
  villageName?: string;
  villageGPSLat?: string;
  villageGPSLong?: string;
  email?: string;
  status?: string;
  fileName?: string;
  category?: string;
  topic?: string;
  duration?: string;
  meetingDate?: string;
  role?: string;
  manager?: string;
  /*uploadDocument?: string;*/
}
