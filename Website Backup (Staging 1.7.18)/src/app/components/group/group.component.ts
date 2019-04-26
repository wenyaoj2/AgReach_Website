import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {FirebaseService} from '../../services/firebase.service';

@Component({
  selector: 'app-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.css']
})
export class GroupComponent implements OnInit {

  guid: string;
  group: any;
  memberList = [];
  hasMembers = false;
  hasLocation = false;
  mapCenter: string;
  extWorkerEmail;
  extWorkerName;

  constructor(private route: ActivatedRoute,
              private router: Router,
              private firebaseSvc: FirebaseService) {
  }

  ngOnInit() {
    this.guid = this.route.snapshot.params['id'];

    this.firebaseSvc.getGroup(this.guid).then((group: any) => {
      this.group = group;

      if (group.members && group.members.length > 0) {
        for (let i = 0; i < group.members.length; i++) {
          this.hasMembers = true;
          this.firebaseSvc.getContactByGuid(group.members[i]).then(contact => {
            this.memberList.push(contact);
          });
        }
      }

      // Check to see if we should display the group on a map
      if (group.villageGPSLat) {
        this.hasLocation = true;
        this.mapCenter = this.group.villageGPSLat + ', ' + this.group.villageGPSLong;
      } else if (group.villageLocation) {
        this.hasLocation = true;
        this.mapCenter = this.group.villageLocation;
      } else {
        this.hasLocation = false;
      }

      if (this.group.extensionWorkerKey) {
        this.firebaseSvc.getUserObject(this.group.extensionWorkerKey).subscribe(user => {
          this.extWorkerEmail = user.email;
          this.extWorkerName = user.fullName || '';
        });
      }
    });
  }

}
