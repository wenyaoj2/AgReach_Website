import {Component, OnInit} from '@angular/core';
import {FirebaseService} from '../../services/firebase.service';
import {Router, ActivatedRoute, Params} from '@angular/router';
import {FlashMessagesService} from 'angular2-flash-messages';

@Component({
  selector: 'app-extension-workers-list',
  templateUrl: './extension-workers-list.component.html',
  styleUrls: ['./extension-workers-list.component.css']
})
export class ExtensionWorkersListComponent implements OnInit {
  viewFarmers: any[];
  viewExtensionWorkerList: any;

  constructor(private firebaseService: FirebaseService,
              private router: Router,
              private route: ActivatedRoute,
              public flashMessage: FlashMessagesService) {
  }

  ngOnInit() {
    this.firebaseService.getExtensionWorkerList().subscribe(viewExtensionWorkerList => {
      this.viewExtensionWorkerList = viewExtensionWorkerList;
    });
  }

  /*  viewIndividualVisit(email, id) {
        console.log(email);
        console.log(id);
        this.firebaseService.getFarmers(email).subscribe(viewFarmers => {
            this.viewFarmers = viewFarmers;
            this.router.navigate(['/test']);
        })
    }*/

}
