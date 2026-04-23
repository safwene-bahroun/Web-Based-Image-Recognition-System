import { Component, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, takeUntil } from 'rxjs';
import { UploadService } from '../upload-image.service';
import { WebcamImage, WebcamInitError, WebcamModule, WebcamUtil } from 'ngx-webcam';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-face-verify',
  standalone: true,
  imports: [CommonModule, WebcamModule, FormsModule],
  templateUrl: './verify-face.component.html',
  styleUrls: ['./verify-face.component.css']
})
export class FaceVerifyComponent implements OnDestroy, AfterViewInit {
  // Webcam settings
  showWebcam = true;
  trigger = new Subject<void>();
  videoOptions: MediaTrackConstraints = {
    width: { ideal: 640 },
    height: { ideal: 480 }
  };

  // Verification state
  isLoading = false;
  errorMessage = '';
  isAutoCaptureEnabled = false;
  captureInterval = 2000;
  public faceResult$: Observable<any>;

  private autoCaptureInterval: any;
  private destroy$ = new Subject<void>();

  constructor(
    public uploadService: UploadService,
  ) {
    this.faceResult$ = this.uploadService.faceVerificationResult$;
  }

  ngAfterViewInit(): void {
    // Initialization if needed
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoCapture();
  }

  get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }

  triggerSnapshot(): void {
    this.trigger.next();
  }

  handleImage(webcamImage: WebcamImage): void {
    this.isLoading = true;
    this.errorMessage = '';

    const blob = this.dataUriToBlob(webcamImage.imageAsDataUrl);
    const file = new File([blob], 'face_capture.jpg', { type: 'image/jpeg' });

    this.uploadService.verifyFace(file).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => this.isLoading = false,
      error: (err) => {
        this.errorMessage = err.message || 'Verification failed';
        this.isLoading = false;
      }
    });
  }

  private dataUriToBlob(dataURI: string): Blob {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: mimeString });
  }

  toggleAutoCapture(): void {
    this.isAutoCaptureEnabled = !this.isAutoCaptureEnabled;
    if (this.isAutoCaptureEnabled) {
      this.startAutoCapture();
    } else {
      this.stopAutoCapture();
    }
  }

  private startAutoCapture(): void {
    this.autoCaptureInterval = setInterval(() => {
      this.triggerSnapshot();
    }, this.captureInterval);
  }

  private stopAutoCapture(): void {
    if (this.autoCaptureInterval) {
      clearInterval(this.autoCaptureInterval);
      this.autoCaptureInterval = null;
    }
  }

  handleInitError(error: WebcamInitError): void {
    this.errorMessage = error.message || 'Camera initialization failed';
  }
}