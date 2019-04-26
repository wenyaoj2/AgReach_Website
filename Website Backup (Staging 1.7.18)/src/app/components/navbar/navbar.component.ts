import {Component, OnInit} from '@angular/core';
import {AngularFireAuth} from 'angularfire2/auth';
import {Router} from '@angular/router';
import {AuthService} from '../../services/auth.service';

enum PermissionLevel {
  none = 0,
  manager = 1,
  stakeholder = 2,
  admin = 3
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  role: PermissionLevel = PermissionLevel.none;
  user: any;
  public error: any;

  constructor(public afAuth: AngularFireAuth, private authSvc: AuthService, private router: Router) {
    this.user = afAuth.authState;
    this.authSvc.getPermissionLevel().then((permission: PermissionLevel) => {
      console.log(permission);
    }).catch(err => {
      //
    });
  }

  ngOnInit() {

  }

  logout() {
    this.afAuth.auth.signOut().then((success) => {
      this.router.navigate(['/login']);
    })
      .catch((error: any) => {
        if (error) {
          this.error = error;
          console.log(this.error);
        }
      });
  }

}
