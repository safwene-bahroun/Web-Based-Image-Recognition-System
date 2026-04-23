import { Component, OnDestroy } from '@angular/core';
import { Router, RouterLink, NavigationEnd, RouterModule } from '@angular/router';
import { UploadService } from '../upload-image.service';
import { Subscription, filter } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterLink, RouterModule,CommonModule],
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.css']
})
export class NavBarComponent implements OnDestroy {
  filename: string | null = null;
  currentMode: 'prediction' | 'barcode' | null = null;

  displayText: string = 'Upload to Predict';      // <- now it's a variable
  destinationLink: any[] | null = null;            // <- now it's a variable

  private subs = new Subscription();

  constructor(
    private uploadService: UploadService,
    private router: Router
  ) {
    // Subscribe to filename changes
    this.subs.add(
      this.uploadService.filename$.subscribe(filename => {
        this.filename = filename;
        this.updateDisplay();   // <- update values when filename changes
      })
    );

    // Detect route changes to determine mode
    this.subs.add(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        const url = this.router.url;
        if (url.includes('barcode_results')) {
          this.currentMode = 'barcode';
        } else if (url.includes('show_items')) {
          this.currentMode = 'prediction';
        } else {
          this.currentMode = null;
        }
        this.updateDisplay();   // <- update values when route changes
      })
    );
  }

  private updateDisplay(): void {
    if (!this.filename) {
      this.displayText = 'Upload to Predict';
      this.destinationLink = null;
      return;
    }

    if (this.currentMode === 'barcode') {
      this.displayText = 'Barcode Results';
      this.destinationLink = ['/barcode_results', this.filename];
    } else if (this.currentMode === 'prediction') {
      this.displayText = 'Predicted Items';
      this.destinationLink = ['/show_items', this.filename];
    } else {
      this.displayText = 'View Results';
      this.destinationLink = null;
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
