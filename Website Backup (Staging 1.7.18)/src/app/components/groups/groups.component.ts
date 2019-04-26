import {Component, OnInit} from '@angular/core';
import {FirebaseService} from '../../services/firebase.service';
import {AngularFireAuth} from 'angularfire2/auth';
import {Router} from '@angular/router';

@Component({
  selector: 'app-groups',
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.css']
})
export class GroupsComponent implements OnInit {

  groupList;

  sortType = 'groupName';
  sortDesc = false;

  constructor(private firebaseSvc: FirebaseService,
              private afAuth: AngularFireAuth,
              private router: Router) {
  }

  ngOnInit() {
    // Get the current user's email from the auth state
    this.afAuth.authState.subscribe(user => {
      if (user && user.email) {
        let email = user.email;

        // Use the email to get the database user object
        this.firebaseSvc.getUser(email).subscribe((dbUser: any) => {
          if (dbUser && dbUser.length === 1) {
            if (dbUser[0].role === 'Admin' || dbUser[0].role === 'Webmaster') {
              // If the user is an admin, get all groups
              this.firebaseSvc.getGroups().then(groups => {
                this.groupList = groups;
                this.sort('groupName');
              });
            } else if (dbUser[0].role === 'Manager') {
              // If the user is a manager, get the groups belonging to their subordinates
              this.firebaseSvc.getSubordinateGroups(email).then(list => {
                this.groupList = list;
                this.sort('groupName');
              });
            } else {
              // If the user is neither manager nor admin, redirect- they don't have permission to view this page
              this.router.navigate(['/']);
            }
          }
        });
      }
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
    this.groupList.sort(function (a, b) {
      // Special use case when sorting by extension worker.
      if (sortType === 'extensionWorker') {
        let aSort = a.extensionWorkerName || a.extensionWorkerEmail;
        let bSort = b.extensionWorkerName || b.extensionWorkerEmail;

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

}
