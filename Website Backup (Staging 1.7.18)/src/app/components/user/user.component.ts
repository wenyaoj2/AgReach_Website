import {Component, OnInit} from '@angular/core';
import {FirebaseService} from '../../services/firebase.service';
import {FlashMessagesService} from 'angular2-flash-messages';
import {AuthService} from '../../services/auth.service';
import {Router} from "@angular/router";

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {
  id: any;
  userList: any;
  roleArray = ['Admin', 'Manager', 'Stakeholder'];
  statusArray = ['Pending', 'Approved', 'Disapproved'];
  appUsers: any;
  websiteUsers: any;
  managerList: any;
  districtList;
  isAdmin = false;
  role = '';
  currentUserEmail: string;

  // Sorting of the website users table
  sortType = '';
  sortDesc = false;

  // Sorting of the app users table
  sortTypeApp = '';
  sortDescApp = false;


  constructor(private firebaseService: FirebaseService,
              public flashMessage: FlashMessagesService,
              private authSvc: AuthService,
              private router: Router) {
  }

  ngOnInit() {
    // Get the currently logged in user and their permissions
    this.authSvc.getUser().then(user => {
      this.currentUserEmail = user.email;
      this.firebaseService.getUser(this.currentUserEmail).subscribe(firebaseUsers => {
        if (firebaseUsers && firebaseUsers.length > 0) {
          // There should only be one, but just in case we'll only use index 0
          this.isAdmin = firebaseUsers[0].isAdmin;
          this.role = firebaseUsers[0].role;

          if (this.role.toLowerCase() === 'stakeholder' && !this.isAdmin) {
            // Only Admin and Managers can access this page.  If the user is a Stakeholder w/o admin privs, redirect.
            this.router.navigate(['/']);
          }
        }
      });
    });

    // Get all the possible districts from Firebase
    this.firebaseService.getDistricts('Malawi').subscribe(distList => {
      this.districtList = distList;
    });

    // Get all the users from Firebase
    this.firebaseService.getNewUser().subscribe(users => {
      this.userList = users;
      this.loadUsers(this.userList);

      if (this.sortType !== '') {
        this.sortManagementUsers(this.sortType);
      }
      if (this.sortTypeApp !== '') {
        this.sortAppUsers(this.sortTypeApp);
      }
    });
  }

  /**
   * Load the users from firebase, splitting them into app users and website users
   * @param userList
   */
  loadUsers(userList) {
    this.appUsers = [];
    this.websiteUsers = [];
    this.managerList = [];

    for (let i = 0; i < userList.length; i++) {
      // Separate the users into different tables according to whether they're a website user or an app user

      if (userList[i].$key.length === 28) {
        this.appUsers.push(userList[i]);
      } else {
        this.websiteUsers.push(userList[i]);

        // If the website user is approved and has the role of manager, we'll add them to the list of available managers
        if (userList[i].role.toLowerCase() === 'manager' && userList[i].status.toLowerCase() === 'approved') {
          this.managerList.push(userList[i]);
        }

      }
    }
  }

  /**
   * Sort the website users table
   * @param sortType
   */
  sortManagementUsers(sortType) {
    this.sortType = sortType;
    this.sortDesc = !this.sortDesc;

    let direction = this.sortDesc ? 1 : -1;

    this.websiteUsers.sort(function (a, b) {
      // In case the property doesn't exist, default to a blank string so that the sort still works
      if (!a[sortType]) {
        a[sortType] = '';
      }
      if (!b[sortType]) {
        b[sortType] = '';
      }

      if (a[sortType] < b[sortType]) {
        return -1 * direction;
      } else if (a[sortType] > b[sortType]) {
        return direction;
      } else {
        return 0;
      }
    });
  }

  /**
   * Sort the app users table
   * @param sortType
   */
  sortAppUsers(sortType) {
    this.sortTypeApp = sortType;
    this.sortDescApp = !this.sortDescApp;

    let direction = this.sortDescApp ? 1 : -1;

    this.appUsers.sort(function (a, b) {
      // In case the property doesn't exist, default to a blank string so that the sort still works
      if (!a[sortType]) {
        a[sortType] = '';
      }
      if (!b[sortType]) {
        b[sortType] = '';
      }

      if (a[sortType] < b[sortType]) {
        return -1 * direction;
      } else if (a[sortType] > b[sortType]) {
        return direction;
      } else {
        return 0;
      }
    });
  }

  /**
   * Helper method that will update the specified user object (referenced via its index within this.userList) to Firebase
   * @param index
   */
  save(index) {
    this.firebaseService.updateUser(this.userList[index].$key, this.userList[index]).then(() => {
      this.flashMessage.show('User successfully updated', {cssClass: 'alert-success', timeout: 2000});
    });
  }

  /**
   * Fired when a user's status is updated
   * @param event
   * @param item
   */
  statusInput(event, item) {
    event.preventDefault();
    // Get the new status
    let newStatus = event.target.value;
    newStatus = newStatus.slice(3);
    // Get the proper user object and assign it the new status
    const index = this.userList.indexOf(item);
    this.userList[index].status = newStatus;
    // Save to Firebase
    this.save(index);
  }

  /**
   * Fired when the extension worker's assigned section is changed
   * @param event
   * @param user
   */
  sectionInput(event, user) {
    // Get the proper user object and update it
    const index = this.userList.indexOf(user);
    this.userList[index].assignedSection = event.target.value;

    // Save the user object
    this.save(index);
  }

  /**
   * Fired when the admin checkbox is changed
   * @param event
   * @param user
   */
  adminInput(event, user) {
    if (user.email === this.currentUserEmail) {
      // A user shouldn't be able to change their own admin status
      // If it's the current user, do nothing
      return;
    }
    // Find the user in our FireBaseListObservable
    const index = this.userList.indexOf(user);
    // Set the admin flag
    this.userList[index].isAdmin = event.target.checked;
    // Save to Firebase
    this.save(index);
  }

  /**
   * This method is attached to the child area-picker-component, and will fire when an area is selected
   * @param event
   * @param user
   */
  areaComponentSelected(event, user) {
    // Find the user in our FireBaseListObservable
    const index = this.userList.indexOf(user);

    // Update the user to have the appropriate area and district
    if (event.district) {
      // The entire district object is returned in event.district; be sure to only take the name string
      this.userList[index].district = event.district.name;
    }
    if (event.area) {
      this.userList[index].area = event.area;
    }

    // Save the user
    this.save(index);
  }

  /**
   * Fired when a website user is assigned a new role
   * @param event
   * @param item
   */
  roleInput(event, item) {
    event.preventDefault();
    // Get the role
    let newRole = event.target.value;
    newRole = newRole.slice(3);
    // Find the proper user object
    const index = this.userList.indexOf(item);
    // Assign the role
    this.userList[index].role = newRole;
    // Save to Firebase
    this.save(index);
  }

  /**
   * Fires when an app user is assigned a manager
   * @param event
   * @param item
   */
  managerInput(event, item) {
    event.preventDefault();
    // Get the manager
    const newManager = event.target.value;
    // Retrieve the proper user object for the extension worker
    const index = this.userList.indexOf(item);
    // Assign the manager
    this.userList[index].manager = newManager;
    // Save to Firebase
    this.save(index);
  }

  nameChanged(event, item) {
    event.preventDefault();
    // Get the manager
    const name = event.target.value;
    // Retrieve the proper user object for the extension worker
    const index = this.userList.indexOf(item);
    // Assign the manager
    this.userList[index].fullName = name;
    // Save to Firebase
    this.save(index);
  }
}
