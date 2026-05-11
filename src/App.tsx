import { Suspense, lazy } from "react";
import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { AlertProvider } from "./components/alert/AlertProvider";
import { LoadingOverlayProvider } from "./components/loading/LoadingOverlayProvider";
import { FullScreenLoadingOverlay } from "./components/loading/FullScreenLoadingOverlay";
import { LobbyBgmOrchestrator } from "./components/LobbyBgmOrchestrator";
import { LobbyUiSoundRoot } from "./components/LobbyUiSoundRoot";
import { GameShellProvider } from "./components/GameShellProvider";
import { IosInstallGuide } from "./components/IosInstallGuide";
import { PwaInstallBanner } from "./components/PwaInstallBanner";
import { ZendeskLoader } from "./components/ZendeskLoader";
import { AuthModalsProvider } from "./features/auth/AuthModalsProvider";
import {
  ForgotPasswordRedirect,
  LoginRedirect,
  RegisterRedirect,
} from "./features/auth/AuthRedirects";
import { LandingPage } from "./features/lobby/LandingPage";
import { LocaleHtmlSync } from "./i18n/LocaleHtmlSync";
import { GatewayLobbyProvider } from "./realtime/GatewayLobbyProvider";
import { WalletProvider } from "./wallet/WalletProvider";

const EventsRedirect = lazy(() =>
  import("./features/lobby/EventsRedirect").then((m) => ({
    default: m.EventsRedirect,
  })),
);
const GamePopoutPage = lazy(() =>
  import("./features/lobby/GamePopoutPage").then((m) => ({
    default: m.GamePopoutPage,
  })),
);
const GamePlayPage = lazy(() =>
  import("./features/lobby/GamePlayPage").then((m) => ({
    default: m.GamePlayPage,
  })),
);
const PromoPage = lazy(() =>
  import("./features/lobby/PromoPage").then((m) => ({ default: m.PromoPage })),
);
const ProfilePage = lazy(() =>
  import("./features/lobby/ProfilePage").then((m) => ({
    default: m.ProfilePage,
  })),
);
const RedeemPage = lazy(() =>
  import("./features/lobby/RedeemPage").then((m) => ({
    default: m.RedeemPage,
  })),
);
const ShopPage = lazy(() =>
  import("./features/shop/ShopPage").then((m) => ({ default: m.ShopPage })),
);
const SessionLayout = lazy(() =>
  import("./components/session/SessionLayout").then((m) => ({
    default: m.SessionLayout,
  })),
);

export default function App() {
  return (
    <BrowserRouter>
      <LocaleHtmlSync />
      <AuthProvider>
        <LoadingOverlayProvider>
          <WalletProvider>
            <AlertProvider>
              <GatewayLobbyProvider>
                <AuthModalsProvider>
                  <GameShellProvider>
                    <LobbyBgmOrchestrator />
                    <ZendeskLoader />
                    <PwaInstallBanner />
                    <IosInstallGuide />
                    <Suspense fallback={<FullScreenLoadingOverlay />}>
                      <LobbyUiSoundRoot />
                      <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route
                          path="/game-popout"
                          element={<GamePopoutPage />}
                        />
                        <Route path="/play" element={<GamePlayPage />} />
                        <Route path="/login" element={<LoginRedirect />} />
                        <Route
                          path="/register"
                          element={<RegisterRedirect />}
                        />
                        <Route
                          path="/forgot-password"
                          element={<ForgotPasswordRedirect />}
                        />
                        <Route element={<RequireAuth />}>
                          <Route path="/events" element={<EventsRedirect />} />
                          <Route element={<SessionLayout />}>
                            <Route path="/shop" element={<ShopPage />} />
                            <Route
                              path="/redeem/form/:method"
                              element={<Navigate to="/redeem" replace />}
                            />
                            <Route path="/redeem" element={<RedeemPage />} />
                            <Route path="/promo" element={<PromoPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                          </Route>
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Suspense>
                  </GameShellProvider>
                </AuthModalsProvider>
              </GatewayLobbyProvider>
            </AlertProvider>
          </WalletProvider>
        </LoadingOverlayProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
