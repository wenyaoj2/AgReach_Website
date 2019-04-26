import { Component, OnInit } from '@angular/core';

import { FirebaseService } from '../../services/firebase.service';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { FlashMessagesService } from 'angular2-flash-messages';

@Component({
  selector: 'app-edituser',
  templateUrl: './edituser.component.html',
  styleUrls: ['./edituser.component.css']
})
export class EdituserComponent implements OnInit {
    id: any;
    name: any;
    age: any;
    gender: any;
    //email: any;
    memberships: any;
    educationlevel: any;
    district: any;
    villagename: any;
    viewUser: any;
    test: any;
    
  constructor(private firebaseService: FirebaseService,
              private router: Router,
              private route: ActivatedRoute,
              public flashMessage: FlashMessagesService) { }

  ngOnInit() {
      this.id = this.route.snapshot.params['id'];
      
      this.firebaseService.getUserDetails(this.id).subscribe(viewUser => {
          this.viewUser = viewUser;
          //this.email = viewUser.email;
          this.name = viewUser.farmerInformation.name;
          this.age = viewUser.farmerInformation.age;
          this.gender = viewUser.farmerInformation.gender;
          this.memberships = viewUser.farmerInformation.memberships;
          this.educationlevel = viewUser.farmerInformation.educationLevel;
          this.district = viewUser.farmerInformation.district;
          this.villagename = viewUser.farmerInformation.villageName;
      });
  }
  
  editUser() {
      let editDetails = {
          //email: this.email,
          name: this.name,
          age: this.age,
          gender: this.gender,
          memberships: this.memberships,
          educationLevel: this.educationlevel,
          district: this.district,
          villageName: this.villagename  
      }
      
      this.firebaseService.updateFarmerInformation(this.id, editDetails);
      this.flashMessage.show('The user ' + this.name + ' is updated', {cssClass: 'alert-success', timeout: 4000});
      this.router.navigate(['/extensionworkerlist']);
      
  }

}
