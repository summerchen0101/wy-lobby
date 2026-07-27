import { Suspense, lazy } from "react";
import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { OAuthReturnHandler } from "./auth/OAuthReturnHandler";
import { RequireAuth } from "./auth/RequireAuth";
import { AlertProvider } from "./components/alert/AlertProvider";
import { LoadingOverlayProvider } from "./components/loading/LoadingOverlayProvider";
import { ForceUpdateGate } from "./components/ForceUpdateGate";
import { FullScreenLoadingOverlay } from "./components/loading/FullScreenLoadingOverlay";
import { LobbyBgmOrchestrator } from "./components/LobbyBgmOrchestrator";
import { LobbyLoginWelcomeOrchestrator } from "./components/LobbyLoginWelcomeOrchestrator";
import { LobbyUiSoundRoot } from "./components/LobbyUiSoundRoot";
import { GameShellProvider } from "./components/GameShellProvider";
import { IosInstallGuide } from "./components/IosInstallGuide";
import { NewbieTutorialGate } from "./features/tutorial/NewbieTutorialGate";
import { BeggarRedEnvelopeGate } from "./features/lobby/BeggarRedEnvelopeGate";
import { DailyLoginGate } from "./features/dailyLogin/DailyLoginGate";
import { DailyLoginModalHost } from "./features/dailyLogin/DailyLoginModalHost";
import { DailyLoginProvider } from "./features/dailyLogin/DailyLoginProvider";
import { GeoGate } from "./features/geo/GeoGate";
import { GeoProvider } from "./features/geo/GeoProvider";
import { SocureDeviceInit } from "./features/socure/SocureDeviceInit";
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
const PaymentCallbackPage = lazy(() =>
  import("./features/payment/PaymentCallbackPage").then((m) => ({
    default: m.PaymentCallbackPage,
  })),
);
const SessionLayout = lazy(() =>
  import("./components/session/SessionLayout").then((m) => ({
    default: m.SessionLayout,
  })),
);
const PrivacyPolicyPage = lazy(() =>
  import("./features/legal/PrivacyPolicyPage").then((m) => ({
    default: m.PrivacyPolicyPage,
  })),
);
const TermsOfServicePage = lazy(() =>
  import("./features/legal/TermsOfServicePage").then((m) => ({
    default: m.TermsOfServicePage,
  })),
);
const SweepsPolicyPage = lazy(() =>
  import("./features/legal/SweepsPolicyPage").then((m) => ({
    default: m.SweepsPolicyPage,
  })),
);
const InviteFriendsTermsPage = lazy(() =>
  import("./features/legal/InviteFriendsTermsPage").then((m) => ({
    default: m.InviteFriendsTermsPage,
  })),
);

export default function App() {
  return (
    <BrowserRouter>
      <LocaleHtmlSync />
      <AuthProvider>
        <ForceUpdateGate />
        <LoadingOverlayProvider>
          <WalletProvider>
            <AlertProvider>
              <OAuthReturnHandler />
              <GatewayLobbyProvider>
                <DailyLoginProvider>
                <AuthModalsProvider>
                  <GeoProvider>
                    <SocureDeviceInit />
                    <GameShellProvider>
                      <LobbyBgmOrchestrator />
                      <LobbyLoginWelcomeOrchestrator />
                      <ZendeskLoader />
                      <PwaInstallBanner />
                      <IosInstallGuide />
                      <NewbieTutorialGate />
                      <BeggarRedEnvelopeGate />
                      <DailyLoginGate />
                      <DailyLoginModalHost />
                      <GeoGate />
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
                          <Route path="/privacy" element={<PrivacyPolicyPage />} />
                          <Route path="/terms" element={<TermsOfServicePage />} />
                          <Route path="/term" element={<TermsOfServicePage />} />
                          <Route path="/sweeps" element={<SweepsPolicyPage />} />
                          <Route path="/invite-terms" element={<InviteFriendsTermsPage />} />
                          <Route
                            path="/payment/callback"
                            element={
                              <PaymentCallbackPage
                                channel="shop"
                                returnPath="/shop"
                                returnLabel="Store"
                              />
                            }
                          />
                          <Route
                            path="/redeem/callback"
                            element={
                              <PaymentCallbackPage
                                channel="redeem"
                                returnPath="/redeem"
                                returnLabel="Redeem"
                              />
                            }
                          />
                          <Route
                            path="/game/callback"
                            element={
                              <PaymentCallbackPage
                                channel="game"
                                returnPath="/"
                                returnLabel="Lobby"
                              />
                            }
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
                  </GeoProvider>
                </AuthModalsProvider>
                </DailyLoginProvider>
              </GatewayLobbyProvider>
            </AlertProvider>
          </WalletProvider>
        </LoadingOverlayProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
