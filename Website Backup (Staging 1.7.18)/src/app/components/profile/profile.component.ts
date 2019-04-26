import {Component, OnInit} from '@angular/core';
import {FirebaseService} from '../../services/firebase.service';
import {AngularFireAuth} from 'angularfire2/auth';
import {FlashMessagesService} from 'angular2-flash-messages';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import * as firebase from 'firebase';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  private userList;
  private authUser;
  private dbUser;

  private fullName;

  passwordForm: FormGroup;
  // We'll use this flag to see if/when the user tries to update their password
  changingPassword = false;
  passwordMismatch = false;

  constructor(private firebaseSvc: FirebaseService, private afAuth: AngularFireAuth, private flashMessage: FlashMessagesService,
              private fb: FormBuilder) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', Validators.compose([Validators.required, Validators.minLength(5)])],
      confirmPassword: ['', Validators.compose([Validators.required, Validators.minLength(5)])]
    });
  }

  ngOnInit() {
    this.afAuth.authState.subscribe(user => {
      this.authUser = user;

      let email;
      if (!this.authUser) {
        // Not logged in, redirect
      } else {
        email = this.authUser.email;

        this.userList = this.firebaseSvc.getUser(email);
        this.userList.subscribe(users => {
          if (users && users.length === 1) {

            this.dbUser = users[0];
            this.fullName = this.dbUser.fullName;
          }
        });
      }
    });
  }

  /**
   * Update the name
   */
  nameChange() {
    // Set the name
    this.dbUser.fullName = this.fullName;
    // Update Firebase
    this.userList.update(this.dbUser.$key, this.dbUser).then(() => {
      this.flashMessage.show('Name successfully updated', {cssClass: 'alert-success', timeout: 2000});
    });
  }

  emailChanged() {
    /**
     * Allowing the user to update their email address will be a non-trivial task.  firebase auth has functionality to
     * handle it, but it involves sending and acting on a confirmation email - an action which
     * the website won't know if/when the user actually completes.  Therefore, this functionality is being delayed for now.
     */
  }

  /**
   * Fired when the Change Password button is clicked.  Updates the password in firebase
   */
  changePassword() {
    // Ensure that the form is valid and that password and confirm password match
    if (this.passwordForm.valid && !this.passwordMismatch) {
      let currentPassword = this.passwordForm.get('currentPassword').value;
      let newPassword = this.passwordForm.get('newPassword').value;

      let credential = firebase.auth.EmailAuthProvider.credential(this.authUser.email, currentPassword);

      // Reauthenticate first, just to eliminate the possibility that reauthentication will be required
      // It also provides an easy way to ensure that the person trying to change passwords is really the intended user
      this.authUser.reauthenticateWithCredential(credential).then(() => {
        this.authUser.updatePassword(newPassword).then(() => {
          this.flashMessage.show('Password successfully updated', {cssClass: 'alert-success', timeout: 2000});
        }).catch(err => {
          if (err && err.code && err.code === 'auth/weak-password') {
            this.flashMessage.show('New password is too weak, please try again with a more secure password', {
              cssClass: 'alert-danger',
              timeout: 2000
            });
          }
        });
      }).catch((err) => {

        if (err && err.code && err.code === 'auth/wrong-password') {
          // Current password didn't work
          this.flashMessage.show('Current password incorrect, please try again', {
            cssClass: 'alert-danger',
            timeout: 2000
          });
        } else {
          this.flashMessage.show('An error occurred, please try again', {
            cssClass: 'alert-danger',
            timeout: 2000
          });
        }
      });
    } else {
      //
    }
  }

  /**
   * Fired when any of the three password-related inputs are changed.  Let's the form know that the user is attempting
   * to change their password, and triggers the appropriate validation
   */
  passwordUpdated() {
    let currentPassword = this.passwordForm.get('currentPassword').value;
    let newPassword = this.passwordForm.get('newPassword').value;
    let confirmPassword = this.passwordForm.get('confirmPassword').value;

    this.changingPassword = currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;
  }

  /**
   * Fired when the confirmPassword input is changed.  Ensures that the user has entered the exact same value for both
   * password and confirm password.  Simpler to do it this way than write a custom validator IMHO
   */
  confirmPassword() {
    let newPassword = this.passwordForm.get('newPassword').value;
    let confirmPassword = this.passwordForm.get('confirmPassword').value;

    this.passwordMismatch = newPassword !== confirmPassword;
  }

}
