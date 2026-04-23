import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UploadService } from '../upload-image.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-predict-image',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './predict-image.component.html',
  styleUrls: ['./predict-image.component.css']
})
export class PredictImageComponent {
  processedImageUrl: SafeUrl | undefined;
  decodedResults: any[] = [];
  detectedLabels: string[] = [];
  mode: 'prediction' | 'barcode' = 'prediction';

  constructor(
    private route: ActivatedRoute,
    private uploadService: UploadService,
    private sanitizer: DomSanitizer
  ) {
    this.uploadService.decodedResults$.subscribe(results => {
      this.decodedResults = results;
    });

    this.uploadService.detectedLabels$.subscribe(labels => {
      this.detectedLabels = labels;
    });

    const filename = this.route.snapshot.paramMap.get('filename');
    this.mode = this.route.snapshot.queryParams['mode'] || 'prediction';

    if (filename) {
      this.loadResults(filename);
    }
  }

  private loadResults(filename: string): void {
    const apiCall = this.mode === 'barcode'
      ? this.uploadService.getBarcodeResult(filename)
      : this.uploadService.predictImage(filename);

    apiCall.subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        this.processedImageUrl = this.sanitizer.bypassSecurityTrustUrl(url);
      },
      error: (error) => {
        console.error(`Failed to load ${this.mode} results:`, error);
      }
    });
  }

isZoomed = false;

toggleZoom() {
    this.isZoomed = !this.isZoomed;
  }
}
