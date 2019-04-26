import {Injectable} from '@angular/core';
import {FirebaseService} from './firebase.service';


@Injectable()
export class UserService {

  private userHashtable = {};
  private userKeyHashtable = {};
  private loaded = false;

  constructor(private firebaseSvc: FirebaseService) {
    // this.init();
  }

  public init() {
    return new Promise(resolve => {
      this.firebaseSvc.getUsers().subscribe(users => {
        this.loaded = true;

        for (let i = 0; i < users.length; i++) {
          let user = users[i];

          // Fill the two hashtables
          this.userHashtable[user.email] = user;
          this.userKeyHashtable[user.$key] = user;
        }
        resolve();
      });
    });
  }

  public getUser(email) {
    return new Promise(resolve => {
      if (!this.loaded) {
        this.init().then(() => {
          resolve(this.userHashtable[email]);
        })
      }
      resolve(this.userHashtable[email]);
    });
  }

  public getUserByKey(key) {
    return new Promise(resolve => {
      if (!this.loaded) {
        this.init().then(() => {
          resolve(this.userKeyHashtable[key]);
        })
      }
      resolve(this.userKeyHashtable[key]);
    });
  }
}
