import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AngularFireDatabase} from 'angularfire2/database-deprecated';
import {AngularFireAuth} from 'angularfire2/auth';
import {FirebaseService} from '../../services/firebase.service';
import {FlashMessagesService} from 'angular2-flash-messages';

@Component({
  selector: 'app-invite',
  templateUrl: './invite.component.html',
  styleUrls: ['./invite.component.css']
})
export class InviteComponent implements OnInit {

  inviteForm: FormGroup;
  userList;
  inviteList;
  district;
  area;

  constructor(private fb: FormBuilder, private afDb: AngularFireDatabase, private afAuth: AngularFireAuth,
              private firebaseSvc: FirebaseService, private flash: FlashMessagesService) {
  }

  ngOnInit() {
    // Initialize the form control and create validators to ensure that a valid email address is supplied
    this.inviteForm = this.fb.group({
      role: [''],
      email: ['', Validators.compose([Validators.required,
        Validators.pattern('^[_a-zA-Z0-9]+(\\.[_a-zA-Z0-9]+)*@[a-zA-Z0-9-]+(\\.[a-zA-Z0-9-]+)*(\\.[a-zA-Z]{2,4})$')])]
    });

    // Fill the user list
    this.firebaseSvc.getUsers().subscribe(list => {
      this.userList = list;
    });
    this.inviteList = this.firebaseSvc.getInvitations();
  }

  /**
   * Fired when the district-area-picker is completed.  Save the values to our local variables
   */
  areaSelected(event) {
    if (event.district) {
      this.district = event.district.name;
    }
    if (event.area) {
      this.area = event.area;
    }
  }

  /**
   * Fired when the user clicks the button to send an invitation code.  Use Firebase to send the email, then insert a value
   * into the invitation table in the firebase DB
   */
  sendInvitation() {
    let email = this.inviteForm.get('email').value;
    let role = this.inviteForm.get('role').value;

    // Make sure the user isn't already registered
    let existingUser = this.userList.find(x => x.email === email);
    if (existingUser) {
      this.flash.show('That email address is already associated with a Management Portal Account', {
        cssClass: 'alert-danger',
        timeout: 2000
      });
      return;
    }

    // Create a new invitation
    let invite = {
      email: email,
      code: this.getCode(),
      role: role,
      district: this.district,
      area: this.area
    };
    if (role !== 'Manager') {
      delete invite.district;
      delete invite.area;
    }
    this.inviteList.push(invite);
    this.flash.show('Invitation email sent!', {cssClass: 'alert-success', timeout: 2000});
    /**
     * That's it!  pushing into the list will create a new entry in the firebase database
     * There is a firebase cloud function that watches the /invitation table and automatically sends an invite email
     * whenever a new record is inserted.
     */
  }

  /**
   * Generate a new random invitation code
   */
  private getCode(): string {
    let code = '';
    let possible = 'ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijklmnpqrstuwxyz123456789';

    for (let i = 0; i < 10; i++) {
      code += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return code;
  }

}
