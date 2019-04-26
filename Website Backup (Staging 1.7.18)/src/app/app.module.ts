import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {HttpModule} from '@angular/http';
import {RouterModule, Routes} from '@angular/router';
import {AngularFireModule} from 'angularfire2';
import {AngularFireAuthModule} from 'angularfire2/auth';
import {AngularFireDatabaseModule} from 'angularfire2/database-deprecated';
import {FirebaseService} from './services/firebase.service';
import {FlashMessagesModule} from 'angular2-flash-messages';
import {ChartsModule} from 'ng2-charts';
import {NguiMapModule} from '@ngui/map';
import {AppComponent} from './app.component';
import {HomeComponent} from './components/home/home.component';
import {NavbarComponent} from './components/navbar/navbar.component';
import {FarmersComponent} from './components/farmers/farmers.component';
import {EdituserComponent} from './components/edituser/edituser.component';
import {ResourcesComponent} from './components/resources/resources.component';
import {UserComponent} from './components/user/user.component';
import {LoginComponent} from './components/login/login.component';
import {RegisterComponent} from './components/register/register.component';
import {ExtensionWorkersListComponent} from './components/extension-workers-list/extension-workers-list.component';
import {GpsLocationComponent} from './components/gps-location/gps-location.component';
import {ViewFarmerComponent} from './components/view-farmer/view-farmer.component';
import {NgxChartsModule} from '@swimlane/ngx-charts';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {AuthService} from './services/auth.service';
import {AreaPickerComponent} from './components/area-picker/area-picker.component';
import {StatService} from './services/stat.service';
import {ProfileComponent} from './components/profile/profile.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { InviteComponent } from './components/invite/invite.component';
import { GroupsComponent } from './components/groups/groups.component';
import { GroupComponent } from './components/group/group.component';
import {UserService} from './services/user.service';

export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyB5BpUKULqzsLH0dSIP3vB202iP9t7sqiE',
    authDomain: 'agreach-6a5ee.firebaseapp.com',
    databaseURL: 'https://agreach-6a5ee.firebaseio.com',
    projectId: 'agreach-6a5ee',
    storageBucket: 'agreach-6a5ee.appspot.com',
    messagingSenderId: '397559641053'
  }
};

const appRoutes: Routes = [
  {path: 'farmers', component: FarmersComponent},
  {path: 'view-farmer/:id', component: ViewFarmerComponent},
  {path: 'edituser/:id', component: EdituserComponent},
  {path: 'resources', component: ResourcesComponent},
  {path: 'user', component: UserComponent},
  {path: 'login', component: LoginComponent},
  {path: 'register', component: RegisterComponent},
  {path: 'extension-worker-list', component: ExtensionWorkersListComponent},
  {path: 'gps-location/:id/:email', component: GpsLocationComponent},
  {path: 'profile', component: ProfileComponent},
  {path: 'resetPassword', component: ResetPasswordComponent},
  {path: 'invite', component: InviteComponent},
  {path: 'groups', component: GroupsComponent},
  {path: 'group/:id', component: GroupComponent},
  {path: '', component: HomeComponent}
];

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    NavbarComponent,
    FarmersComponent,
    EdituserComponent,
    ResourcesComponent,
    UserComponent,
    LoginComponent,
    RegisterComponent,
    ExtensionWorkersListComponent,
    GpsLocationComponent,
    ViewFarmerComponent,
    AreaPickerComponent,
    ProfileComponent,
    ResetPasswordComponent,
    InviteComponent,
    GroupsComponent,
    GroupComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    AngularFireModule.initializeApp(environment.firebase),
    RouterModule.forRoot(appRoutes),
    AngularFireAuthModule,
    AngularFireDatabaseModule,
    FlashMessagesModule,
    NguiMapModule.forRoot({
      apiUrl: 'https://maps.google.com/maps/api/js?key=AIzaSyC69FJl_UfUCInKEj4_HTHdCi1YT2sQIFw&libraries=visualization'
    }),
    ChartsModule,
    NgxChartsModule,
    BrowserAnimationsModule
  ],
  providers: [FirebaseService, AuthService, StatService, UserService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
