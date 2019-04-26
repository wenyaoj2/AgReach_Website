import {Component, OnInit} from '@angular/core';
import {AngularFireAuth} from 'angularfire2/auth';
import {FlashMessagesService} from 'angular2-flash-messages';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {

  emailAddress = '';

  constructor(private afAuth: AngularFireAuth, private flash: FlashMessagesService) {
  }

  ngOnInit() {
  }

  resetPassword() {
    if (this.emailAddress.trim() !== '') {
      this.afAuth.auth.sendPasswordResetEmail(this.emailAddress).then((success) => {
        this.flash.show('Password reset email sent!  Please allow up to an hour for the email to arrive.', {
          cssClass: 'alert-success',
          timeout: 2000
        });
      }).catch((error) => {
        this.flash.show('An error occurred, please try again', {cssClass: 'alert-danger', timeout: 2000});
      });
    }
  }

}
