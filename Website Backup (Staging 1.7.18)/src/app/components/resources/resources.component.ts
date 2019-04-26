import {Component, OnInit} from '@angular/core';
import {FirebaseService} from '../../services/firebase.service';
import {FlashMessagesService} from 'angular2-flash-messages';
import * as firebase from 'firebase';
import {AuthService} from '../../services/auth.service';

enum PermissionLevel {
  none = 0,
  manager = 1,
  stakeholder = 2,
  admin = 3
}

@Component({
  selector: 'app-resources',
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.css']
})
export class ResourcesComponent implements OnInit {
  fileName: any;
  description: any;
  resourceType: any;
  resourceList: any;
  progress: number;
  fileToUpload: File;

  isAdmin = false;
  fileToDelete;

  constructor(private firebaseService: FirebaseService,
              public flashMessage: FlashMessagesService,
              private authService: AuthService) {
    // Get the permission level.  Only admins can delete resources
    this.authService.getPermissionLevel().then((permissions: PermissionLevel) => {
      if (permissions === PermissionLevel.admin) {
        this.isAdmin = true;
      }
    });
  }

  ngOnInit() {
    this.firebaseService.getResources().subscribe(resourceList => {
      this.resourceList = resourceList;
    });
  }

  /**
   * Called when the file picker is clicked.  Let the backend know which file was selected for upload
   * @param event
   */
  fileSelected(event) {
    this.fileToUpload = event.target.files[0];
    this.fileName = this.fileToUpload.name;
  }

  /**
   * Called once the user confirms the deletion.  Remove the resource from both firebase storage and firebase database
   */
  deleteResource(event) {
    event.preventDefault();

    if (this.fileToDelete) {
      // Remove it from storage
      let storageRef = firebase.storage().ref();
      storageRef.child('/resources/' + this.fileToDelete.fileName).delete().then(() => {
        // Successfully deleted the file from storage, now remove from the database
        console.log('deleted from storage!');
        this.firebaseService.deleteResource(this.fileToDelete).then(() => {
          console.log('deleted from database!');
        });
      }).catch(err => {
        // Something went wrong deleting from storage
        console.log(err);
      });
    }
  }

  /**
   * User clicked the delete resource button.  Figure out which resource they clicked, and show a confirmation dialog to make sure
   * they really want to delete it
   * @param event
   * @param resource
   */
  deleteClick(event, resource) {
    event.preventDefault();
    this.fileToDelete = resource;
  }

  /**
   * Cancel the file deletion operation
   * @param event
   */
  cancelDelete(event) {
    event.preventDefault();
    this.fileToDelete = undefined;
  }

  /**
   * Upload the resource to firebase storage and make an associated database entry
   */
  upload() {
    // Make sure they selected a file
    if (!this.fileToUpload) {
      this.flashMessage.show('Please select a document', {cssClass: 'alert-danger', timeout: 2000});
      return;
    }

    // Make sure they included a description and document type
    if (!this.description) {
      this.flashMessage.show('Please enter a resource description', {cssClass: 'alert-danger', timeout: 2000});
      return;
    } else if (!this.resourceType) {
      this.flashMessage.show('Please select a resource type', {cssClass: 'alert-danger', timeout: 2000});
      return;
    }

    let newDocument = {
      fileName: this.fileToUpload.name,
      size: this.fileToUpload.size,
      description: this.description,
      resourceType: this.resourceType,
      downloadUrl: ''
    };

    let storageRef = firebase.storage().ref();
    let uploadTask = storageRef.child('/resources/' + this.fileName).put(this.fileToUpload);

    uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED,
      (snapshot: any) => {
        // Upload in progress, update the progress bar
        this.progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      },
      (error) => {
        // fail
        console.log(error)
      },
      () => {
        // success
        newDocument.downloadUrl = uploadTask.snapshot.downloadURL;
        this.firebaseService.addResource(newDocument).then(() => {
          this.flashMessage.show('Document uploaded successfully!', {cssClass: 'alert-success', timeout: 3000});
        });
      }
    );
  }
}
