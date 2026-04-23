import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, throwError, tap } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private apiUrl = 'http://127.0.0.1:5000'; // Backend URL

  // BehaviorSubjects to manage state
  private filenameSubject = new BehaviorSubject<string | null>(null);
  filename$: Observable<string | null> = this.filenameSubject.asObservable();

  private decodedResultsSubject = new BehaviorSubject<any[]>([]);
  decodedResults$ = this.decodedResultsSubject.asObservable();

  private detectedLabelsSubject = new BehaviorSubject<string[]>([]);
  detectedLabels$: Observable<string[]> = this.detectedLabelsSubject.asObservable();

    private faceVerificationResultSubject = new BehaviorSubject<any>(null);
   faceVerificationResult$ = this.faceVerificationResultSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Upload image for prediction
  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post(this.apiUrl + "/upload_image", formData, {
      reportProgress: true,
      responseType: 'json',
    }).pipe(
      tap((response: any) => {
        if (response.filename) {
          this.setFilename(response.filename);
        }
        if (response.detected_labels) {
          this.setDetectedLabels(response.detected_labels);
        }
      }),
      catchError(this.handleError)
    );
  }

  // Get prediction result for the image
  predictImage(filename: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/show_items/${filename}`, { responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  // Update the filename observable
  setFilename(filename: string): void {
    this.filenameSubject.next(filename);
  }

  // Update detected labels
  setDetectedLabels(labels: string[]): void {
    this.detectedLabelsSubject.next(labels);
  }

  // Clear all detected labels
  clearDetectedLabels(): void {
    this.detectedLabelsSubject.next([]);
  }

  // Error handling method
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `An error occurred: ${error.error.message}`;
    } else {
      errorMessage = `Server returned code: ${error.status}, error message is: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // Barcode scanning method
  readBarcode(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
  
    return this.http.post(`${this.apiUrl}/read_barcode`, formData, {
      reportProgress: true,
      responseType: 'json',
    }).pipe(
      tap((response: any) => {
        if (response.filename) {
          this.setFilename(response.filename);
        }
        if (response.results?.barcodes) {
          this.setDecodedResults(response.results.barcodes);
        }
      }),
      catchError(this.handleError)
    );
  }

  setDecodedResults(results: any[]) {
    this.decodedResultsSubject.next(results);
  }

  // Get barcode scan results
  getBarcodeResult(filename: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/barcode_results/${filename}`, {
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }


  verifyFace(imageFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', imageFile);

    return this.http.post(`${this.apiUrl}/verify_face`, formData).pipe(
      tap((response: any) => {
        this.faceVerificationResultSubject.next(response);
      }),
      catchError(this.handleError)
    );
  }

 getFaceVerificationResult(): Observable<any> {
    return this.faceVerificationResult$;
  }

  clearFaceVerificationResult(): void {
    this.faceVerificationResultSubject.next(null);
  }


}
