import {Component, OnInit} from '@angular/core';

import {FirebaseService} from '../../services/firebase.service';
import {Router, ActivatedRoute, Params} from '@angular/router';
import * as firebase from 'firebase';
import {AngularFireAuth} from 'angularfire2/auth';
import {Observable} from 'rxjs/Observable';
import {FlashMessagesService} from 'angular2-flash-messages';
import {AuthService} from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  viewUserRole: any;
  public error: any;
  email: any;
  password: any;
  viewNewUser: any;
  user: Observable<firebase.User>;
  role: any;

  constructor(private firebaseService: FirebaseService, private router: Router, private flashMessage: FlashMessagesService,
              private afAuth: AngularFireAuth, private authService: AuthService) {

    /*this.email = this.email;
    this.password = this.password;*/
    this.user = afAuth.authState;

  }

  ngOnInit() {

  }

  login() {
    // event.preventDefault();

    firebase.auth().signInWithEmailAndPassword(this.email, this.password).then((success) => {
      this.authService.setEmail(this.email);
      this.router.navigate(['/']);

      this.firebaseService.getUsers().subscribe(viewNewUser => {
        this.viewNewUser = viewNewUser;
      });

      this.firebaseService.getExtensionUserRole(this.email).subscribe(viewUserRole => {
        this.viewUserRole = viewUserRole;

        let tempRole;
        if (this.viewUserRole && this.viewUserRole.length === 1) {
          if (this.viewUserRole[0].role) {
            tempRole = this.viewUserRole[0].role;
          } else {
            tempRole = 'Extension Worker';
          }
          this.role = tempRole;
        }
      });
    })
      .catch((error: any) => {
        if (error) {
          this.error = error;
          console.log(this.error);

          if (error.code === 'auth/wrong-password') {
            this.flashMessage.show('Invalid password.', {cssClass: 'alert-danger'});
          } else if (error.code === 'auth/user-not-found') {
            this.flashMessage.show('Invalid password or username not found.', {cssClass: 'alert-danger'});
          }
        }
      });

  }
}

