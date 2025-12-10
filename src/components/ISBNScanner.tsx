import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Camera, Play, Pause, Barcode, Flashlight } from "lucide-react";
import { BinaryBitmap, DecodeHintType, HybridBinarizer, MultiFormatReader, NotFoundException, RGBLuminanceSource, BarcodeFormat } from "@zxing/library";

export type ISBNScannerProps = {
	onISBNDetected: (isbn: string) => void;
	className?: string;
};

export default function ISBNScanner({ onISBNDetected, className }: ISBNScannerProps) {
	const videoContainerRef = useRef<HTMLDivElement>(null);
	const videoElRef = useRef<HTMLVideoElement | null>(null);
	const [isReady, setIsReady] = useState(false);
	const [isStarting, setIsStarting] = useState(false);
	const [isScanning, setIsScanning] = useState(false);
	const { toast } = useToast();
	const [status, setStatus] = useState<string>("Idle");
	const [lastDetected, setLastDetected] = useState<string | null>(null);
	const detectionLockRef = useRef(false);
	const [torchOn, setTorchOn] = useState(false);
	const scanLoopRef = useRef<number | null>(null);
	const readerRef = useRef<MultiFormatReader | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const roiRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

	function getVideoTrack(): MediaStreamTrack | null {
		const el = videoElRef.current as any;
		const stream: MediaStream | undefined = el?.srcObject;
		return stream?.getVideoTracks?.()[0] ?? null;
	}

	async function toggleTorch() {
		try {
			const track = getVideoTrack();
			if (!track) return;
			const capabilities = (track as any).getCapabilities?.() as any;
			if (!capabilities || !("torch" in capabilities)) {
				toast({ title: "Torch not supported", description: "Your device camera doesn't expose torch control" });
				return;
			}
			await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] });
			setTorchOn((v) => !v);
		} catch (e: any) {
			console.error(e);
			toast({ title: "Torch toggle failed", description: e?.message ?? String(e), variant: "destructive" });
		}
	}

	async function startCamera() {
		if (isStarting || isReady) return;
		setIsStarting(true);
		try {
			setStatus("Initializing camera...");
			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: "environment",
					focusMode: "continuous",
					aspectRatio: { ideal: 1.5 },
					width: { ideal: 1280 },
					height: { ideal: 720 },
				},
				audio: false,
			});

			const videoEl = document.createElement("video");
			videoEl.playsInline = true;
			videoEl.muted = true;
			videoEl.autoplay = true;
			videoEl.srcObject = stream;
			await videoEl.play();
			videoElRef.current = videoEl;

			setIsReady(true);
			setStatus("Camera ready");
		} finally {
			setIsStarting(false);
		}
	}

	function stopCamera() {
		stopScanning();
		const track = getVideoTrack();
		track?.stop();
		videoElRef.current = null;
		setIsReady(false);
		setStatus("Idle");
	}

	function normalizeToISBN(text: string): string | null {
		const cleaned = text.replace(/[^0-9Xx]/g, "");
		if (/^(978|979)\d{10}$/.test(cleaned)) return cleaned;
		if(/^\d{9}[\dXx]$/.test(cleaned)) return cleaned.toUpperCase();
		return null;
	}

	async function startScanning() {
		if (!isReady || isScanning) return;
		if (!videoContainerRef.current || !videoElRef.current) return;

		setIsScanning(true);
		setStatus("Scanning...");
		detectionLockRef.current = false;

		// Mount the video element into the container so layout/overlay align
		videoContainerRef.current.innerHTML = "";
		videoContainerRef.current.appendChild(videoElRef.current);
		videoElRef.current.style.width = "100%";
		videoElRef.current.style.height = "100%";
		videoElRef.current.style.objectFit = "cover";

		// Prepare decoder with EAN/UPC-only hints for speed
		const hints = new Map();
		hints.set(DecodeHintType.POSSIBLE_FORMATS, [
			BarcodeFormat.EAN_13,
			BarcodeFormat.EAN_8,
			BarcodeFormat.UPC_A,
			BarcodeFormat.UPC_E,
		]);
		readerRef.current = new MultiFormatReader();
		readerRef.current.setHints(hints);

		if (!canvasRef.current) canvasRef.current = document.createElement("canvas");

		const ensureRoi = () => {
			const v = videoElRef.current!;
			const w = v.videoWidth;
			const h = v.videoHeight;
			if (!w || !h) return null;
			const roiW = Math.floor(w * 0.6);
			const roiH = Math.floor(h * 0.4);
			const x = Math.floor((w - roiW) / 2);
			const y = Math.floor((h - roiH) / 2);
			roiRef.current = { x, y, w: roiW, h: roiH };
			return roiRef.current;
		};

		const scanFrame = () => {
			if (!readerRef.current || !videoElRef.current || detectionLockRef.current) return;
			const roi = roiRef.current || ensureRoi();
			if (!roi) {
				scanLoopRef.current = requestAnimationFrame(scanFrame);
				return;
			}

			const { x, y, w, h } = roi;
			const canvas = canvasRef.current!;
			canvas.width = w;
			canvas.height = h;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				scanLoopRef.current = requestAnimationFrame(scanFrame);
				return;
			}
			ctx.drawImage(videoElRef.current, x, y, w, h, 0, 0, w, h);
			const imageData = ctx.getImageData(0, 0, w, h);
			const luminance = new RGBLuminanceSource(imageData.data, w, h);
			const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminance));
			try {
				const result = readerRef.current.decode(binaryBitmap);
				const isbn = normalizeToISBN(result.getText());
				if (isbn) {
					detectionLockRef.current = true;
					setLastDetected(isbn);
					setStatus("Detected");
					toast({ title: "ISBN Captured", description: isbn });
					onISBNDetected(isbn);
					stopScanning();
					return;
				}
			} catch (e) {
				if (!(e instanceof NotFoundException)) {
					console.error("Decode error", e);
				}
			}
			scanLoopRef.current = requestAnimationFrame(scanFrame);
		};

		scanLoopRef.current = requestAnimationFrame(scanFrame);
	}

	async function fallbackCaptureAndDecode() {
		try {
			const video = videoElRef.current;
			if (!video) return;
			const canvas = document.createElement("canvas");
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const luminance = new RGBLuminanceSource(imageData.data, canvas.width, canvas.height);
			const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminance));
			setStatus("Decoding still...");
			const reader = readerRef.current ?? new MultiFormatReader();
			if (!readerRef.current) {
				const hints = new Map();
				hints.set(DecodeHintType.POSSIBLE_FORMATS, [
					BarcodeFormat.EAN_13,
					BarcodeFormat.EAN_8,
					BarcodeFormat.UPC_A,
					BarcodeFormat.UPC_E,
				]);
				reader.setHints(hints);
			}
			try {
				const result = reader.decode(binaryBitmap);
				const isbn = normalizeToISBN(result.getText());
				if (isbn) {
					setLastDetected(isbn);
					setStatus("Detected");
					toast({ title: "ISBN Captured", description: isbn });
					onISBNDetected(isbn);
					stopScanning();
					return;
				}
				setStatus("No code in still");
				toast({ title: "No barcode detected", description: "Try better lighting and alignment" });
			} catch (e) {
				setStatus("No code in still");
				toast({ title: "No barcode detected", description: "Try better lighting and alignment" });
			}
		} catch (e: any) {
			console.error(e);
			toast({ title: "Decode failed", description: e?.message ?? String(e), variant: "destructive" });
		}
	}

	function stopScanning() {
		if (scanLoopRef.current) {
			cancelAnimationFrame(scanLoopRef.current);
			scanLoopRef.current = null;
		}
		readerRef.current = null;
		roiRef.current = null;
		setIsScanning(false);
		if (isReady) setStatus("Camera ready");
	}

	useEffect(() => {
		return () => {
			stopScanning();
			stopCamera();
		};
	}, []);

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Barcode className="h-5 w-5" /> Scan ISBN Barcode
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="relative w-full aspect-[4/3] bg-black rounded overflow-hidden">
					<div ref={videoContainerRef} className="w-full h-full" />
					{isReady && (
						<div className="absolute inset-0 pointer-events-none">
							<div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-green-400" />
							<div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-green-400" />
							<div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-green-400" />
							<div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-green-400" />
							<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[40%] border-2 border-red-400 opacity-90 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]" />
							{lastDetected && (
								<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+2.5rem)] bg-black/70 text-white text-xs px-2 py-1 rounded">
									Detected: {lastDetected}
								</div>
							)}
						</div>
					)}
					{!isReady && (
						<div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
							<Camera className="h-12 w-12 mb-2 opacity-60" />
							<p>Camera not started</p>
						</div>
					)}
				</div>

				{!isReady ? (
					<Button onClick={startCamera} disabled={isStarting} className="w-full">
						<Play className="h-4 w-4 mr-2" />{isStarting ? "Starting Camera..." : "Start Camera"}
					</Button>
				) : !isScanning ? (
					<div className="flex gap-2">
						<Button onClick={startScanning} className="w-full bg-red-600 hover:bg-red-700">
							<Barcode className="h-4 w-4 mr-2" />Start ISBN Scan
						</Button>
						<Button onClick={toggleTorch} variant="outline" className="whitespace-nowrap">
							<Flashlight className="h-4 w-4 mr-1" /> Torch {torchOn ? "On" : "Off"}
						</Button>
					</div>
				) : (
					<div className="flex gap-2">
						<Button onClick={stopScanning} className="w-full bg-gray-600 hover:bg-gray-700">
							<Pause className="h-4 w-4 mr-2" />Stop Scan
						</Button>
						<Button onClick={fallbackCaptureAndDecode} variant="secondary" className="whitespace-nowrap">Decode Still</Button>
					</div>
				)}

				<div className="text-xs text-muted-foreground space-y-1">
					<p><span className="font-medium">Status:</span> {status}</p>
					{lastDetected && <p><span className="font-medium">Last detected:</span> {lastDetected}</p>}
					<p>• Place the barcode fully inside the red box (center)</p>
					<p>• Hold steady; decoding runs every frame for speed</p>
					<p>• Use Torch if available</p>
				</div>
			</CardContent>
		</Card>
	);
} 