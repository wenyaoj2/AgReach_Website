import {Injectable} from '@angular/core';
import {AngularFireAuth} from 'angularfire2/auth';
import {AngularFireDatabase} from 'angularfire2/database-deprecated';

enum PermissionLevel {
  none = 0,
  manager = 1,
  stakeholder = 2,
  admin = 3
}

@Injectable()
export class AuthService {
  private emailAddress;
  private authUser;
  private databaseUser;

  constructor(private afAuth: AngularFireAuth, private afDb: AngularFireDatabase) {
    this.afAuth.authState.subscribe(user => {
      if (user && user.email) {
        this.authUser = user;
        this.getDatabaseUser(user.email);
      }
    });
  }

  private getDatabaseUser(email) {
    return new Promise((resolve, reject) => {
      if (email) {
        this.afDb.list('/users/', {
          query: {
            orderByChild: 'email',
            equalTo: email,
            limitToFirst: 1
          }
        }).subscribe(users => {
          if (users && users.length === 1) {
            let user = users[0];
            this.databaseUser = user;
            resolve(user);
          }
          reject();
        });
      }
    });
  }

  private getAuthUser() {
    return new Promise((resolve, reject) => {
      this.afAuth.authState.subscribe(user => {
        if (user) {
          this.authUser = user;
          // Resolve with the fireBase user
          resolve(user);
        } else {
          reject();
        }
      });
    });
  }

  /**
   * Return the Firebase.User object representing the currently logged in user
   * @returns {Promise<any>}
   */
  public getUser(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getAuthUser().then(user => {
        if (user) {
          this.getDatabaseUser(this.authUser.email).then(dbUser => {
            resolve(user);
          });
        } else {
          reject();
        }
      }).catch(err => {
        reject(err);
      });
    });
  }

  public setEmail(email) {
    this.emailAddress = email;
  }

  public getPermissionLevel() {
    return new Promise(resolve => {
      if (this.databaseUser) {
        if (this.databaseUser.isAdmin) {
          resolve(PermissionLevel.admin)
        } else if (this.databaseUser.role.toLowerCase() === 'admin') {
          resolve(PermissionLevel.admin);
        } else if (this.databaseUser.role.toLowerCase() === 'manager') {
          resolve(PermissionLevel.manager);
        } else if (this.databaseUser.role.toLowerCase() === 'stakeholder') {
          resolve(PermissionLevel.stakeholder);
        }
      } else {
        this.getUser().then(() => {
          resolve(this.getPermissionLevel());
        });
      }
    });
  }

  /**
   * Returns an object with the logged in user's district, area, and section (whichever of the three are available)
   * @returns {Promise<any>}
   */
  public getAssignedLocation() {
    return new Promise((resolve, reject) => {
      if (this.databaseUser) {
        let location: any = {};
        if (this.databaseUser.district) {
          location.district = this.databaseUser.district;
        }
        if (this.databaseUser.area) {
          location.area = this.databaseUser.area;
        }
        if (this.databaseUser.section) {
          location.section = this.databaseUser.section;
        }

        // Return the location object
        resolve(location);
      }
    });
  }
}
