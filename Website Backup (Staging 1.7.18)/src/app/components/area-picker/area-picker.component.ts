import {Component, OnInit, ViewChild, EventEmitter, Input, Output, Renderer2} from '@angular/core';
import {FirebaseService} from '../../services/firebase.service';

@Component({
  selector: 'app-area-picker',
  templateUrl: './area-picker.component.html',
  styleUrls: ['./area-picker.component.css']
})
export class AreaPickerComponent implements OnInit {

  districtList = [];
  areaList = [];
  selectedDistrict;
  selectedArea;
  @ViewChild('selectAreaLabel') selectAreaLabel;
  @ViewChild('areaSelect') areaSelect;

  // Allow the parent component to disable input on this control
  @Input() disabled: boolean;

  // Allow the parent component to specify the country
  @Input() country: string;

  // Load any previously selected district / area values
  @Input() previousDistrict: string;
  @Input() previousArea: string;

  // The event output, which will provide the selected district and area to the parent component
  @Output() update = new EventEmitter();

  constructor(private firebaseService: FirebaseService, private renderer: Renderer2) {

  }

  ngOnInit() {
    // Load the districts
    this.firebaseService.getDistricts(this.country || 'Malawi').subscribe(list => {
      this.districtList = list;

      if (this.previousDistrict) {
        // Since the previous district input is a string, let's find the matching object
        this.selectedDistrict = this.districtList.find(d => d.name === this.previousDistrict);

        // Now load the appropriate areas for this district
        this.getAreas(this.selectedDistrict);

        // Show the label and dropdown to select the areas
        this.renderer.removeClass(this.selectAreaLabel.nativeElement, 'hidden');
        this.renderer.removeClass(this.areaSelect.nativeElement, 'hidden');
      }
      if (this.previousArea) {
        this.selectedArea = this.previousArea;
        // Show the label and dropdown to select the areas
        this.renderer.removeClass(this.selectAreaLabel.nativeElement, 'hidden');
        this.renderer.removeClass(this.areaSelect.nativeElement, 'hidden');
      }
    });
  }

  /**
   * Fired when the area dropdown is selected; fires an event via our Output eventemitter
   */
  selectArea() {
    let result = {
      district: this.selectedDistrict,
      area: this.selectedArea
    };
    this.update.emit(result);
  }

  districtAreaSelect(event) {
    // Clear any previously selected area
    this.selectedArea = null;

    // Get the selected district from the district dropdown
    let index = event.target.selectedIndex;

    // Get the original district object (subtract 1 to account for the blank first option in the select)
    this.selectedDistrict = this.districtList[index - 1];

    // Load the areas
    this.getAreas(this.selectedDistrict);
  }

  getAreas(districtObject) {
    // Build the list of areas within the selected district
    this.areaList = [];
    let tempAreaList = [];
    Object.keys(districtObject.areas).forEach(function (key) {
      tempAreaList.push(key.toString());
    });
    // Bind the areas
    this.areaList = tempAreaList;

    // Show the label and dropdown to select the areas
    this.renderer.removeClass(this.selectAreaLabel.nativeElement, 'hidden');
    this.renderer.removeClass(this.areaSelect.nativeElement, 'hidden');
  }

}
