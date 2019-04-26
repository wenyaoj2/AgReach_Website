import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import * as firebase from 'firebase';
import {FirebaseService} from '../../services/firebase.service';
import {FlashMessagesService} from 'angular2-flash-messages';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  email: string = '';
  fullName: string;
  accessCode: string;

  registerForm: FormGroup;
  passwordMismatch = false;

  constructor(private firebaseService: FirebaseService, private router: Router, private flash: FlashMessagesService,
              private route: ActivatedRoute, private fb: FormBuilder) {

  }

  ngOnInit() {
    console.log("test ngOnInit!!");
    this.route.queryParams.subscribe(params => {
      if (params.email) {
        this.email = params.email;
      }
      if (params.code) {
        this.accessCode = params.code;
      }

      // Initialize the form control and create validators to ensure that a valid email address is supplied
      this.registerForm = this.fb.group({
        fullName: ['', Validators.required],
        accessCode: [this.accessCode, Validators.required],
        password: ['', Validators.compose([Validators.required, Validators.minLength(5)])],
        confirmPassword: ['', Validators.compose([Validators.required, Validators.minLength(5)])],
        email: [this.email, Validators.compose([Validators.required,
          Validators.pattern('^[_a-zA-Z0-9]+(\\.[_a-zA-Z0-9]+)*@[a-zA-Z0-9-]+(\\.[a-zA-Z0-9-]+)*(\\.[a-zA-Z]{2,4})$')])]
      });
    });
  }

  areaUpdated() {

  }

  /**
   * Fired when the confirmPassword input is changed.  Ensures that the user has entered the exact same value for both
   * password and confirm password
   */
  confirmPassword() {
    let newPassword = this.registerForm.get('password').value;
    let confirmPassword = this.registerForm.get('confirmPassword').value;

    this.passwordMismatch = newPassword !== confirmPassword;
  }

  register() {
    console.log("just for test register function!!!!!");
    if (this.registerForm.valid) {
      // Get the fields from the formbuilder
      this.fullName = this.registerForm.get('fullName').value;
      this.email = this.registerForm.get('email').value;
      console.log("this.email", this.email);
      let password = this.registerForm.get('password').value;

      // Build the user object
      let newUser = {
        fullName: this.fullName,
        email: this.email,
        role: '',
        district: '',
        area: '',
        status: 'Approved',
        timestamp: new Date().toISOString()
      };

      // event.preventDefault();

      // Make sure this user has an invitation and that their code is correct
      let invitations = this.firebaseService.getInvitations();
      invitations.subscribe(invitationList => {
        console.log("hello");
        let invited = true;

        for (let i = 0; i < invitationList.length; i++) {
          if (invitationList[i].email === this.email && invitationList[i].code === this.accessCode) {
            // Successfully validated the invitation
            invited = true;
            // Grab any extra information provided in the invitation
            if (invitationList[i].role) {
              newUser.role = invitationList[i].role;
            } else {
              delete newUser.role;
            }
            if (invitationList[i].district) {
              newUser.district = invitationList[i].district;
            } else {
              delete newUser.district;
            }
            if (invitationList[i].area) {
              newUser.area = invitationList[i].area;
            } else {
              delete newUser.area;
            }
            return;
          }
        }

        invited = true;
        if (!invited) {
          // The user doesn't have a proper invitation; don't let them register
          this.flash.show('Invalid access code or invitation not found.  Please ask an administrator to send you an invitation.', {
            cssClass: 'alert-danger',
            timeout: 3000
          });
        } else {

          // The user is fully authenticated, create an auth user for them
          firebase.auth().createUserWithEmailAndPassword(this.email, password).then((success) => {
            console.log("user2333test");
            let user = firebase.auth().currentUser;
            console.log("user", user);

            // Create the user table entry
            this.firebaseService.insertUser(newUser).then(() => {
              // TODO: we should remove the invitation now
              this.router.navigate(['/']);
            });
          }).catch((error) => {
            console.log(error);
          });
        }
      });
    }

    // this.router.navigate(['/']);
  }

}
