import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AuthProvider } from "./hooks/useAuth";
import { StudentMetaProvider } from "./hooks/useStudentMeta";
import { DashboardPage } from "./pages/DashboardPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LearningModePage } from "./pages/LearningModePage";
import { LessonPage } from "./pages/LessonPage";
import { PageAnalysisPage } from "./pages/PageAnalysisPage";
import { LoginPage } from "./pages/LoginPage";
import { AskFahmPage } from "./pages/AskFahmPage";
import { AskFahmRedirect } from "./pages/AskFahmRedirect";
import { KnowledgeMapPage } from "./pages/KnowledgeMapPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ProtectedRoute } from "./pages/ProtectedRoute";
import { RegisterPage } from "./pages/RegisterPage";
import { TeacherConceptsPage } from "./pages/TeacherConceptsPage";
import { TeacherDashboardPage } from "./pages/TeacherDashboardPage";
import { TeacherLessonsPage } from "./pages/TeacherLessonsPage";
import { TeacherReviewPage } from "./pages/TeacherReviewPage";
import { TeacherRoute } from "./pages/TeacherRoute";
import { TeacherStudentPage } from "./pages/TeacherStudentPage";
import { TeacherStudentsPage } from "./pages/TeacherStudentsPage";

export function App() {
  return (
    <AuthProvider>
      <StudentMetaProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/teacher" element={<TeacherRoute><TeacherDashboardPage /></TeacherRoute>} />
              <Route path="/teacher/students" element={<TeacherRoute><TeacherStudentsPage /></TeacherRoute>} />
              <Route path="/teacher/students/:studentId" element={<TeacherRoute><TeacherStudentPage /></TeacherRoute>} />
              <Route path="/teacher/concepts" element={<TeacherRoute><TeacherConceptsPage /></TeacherRoute>} />
              <Route path="/teacher/lessons" element={<TeacherRoute><TeacherLessonsPage /></TeacherRoute>} />
              <Route path="/teacher/review" element={<TeacherRoute><TeacherReviewPage /></TeacherRoute>} />
              <Route path="/lesson" element={<LessonPage />} />
              <Route path="/lesson/:materialId/analyze" element={<PageAnalysisPage />} />
              <Route path="/lesson/:materialId/mode" element={<LearningModePage />} />
              <Route path="/lesson/:sessionId/ask" element={<AskFahmPage />} />
              <Route path="/lesson/:sessionId/map" element={<KnowledgeMapPage />} />
              <Route path="/lesson/:sessionId" element={<LessonPage />} />
              <Route path="/map" element={<KnowledgeMapPage />} />
              <Route path="/ask" element={<AskFahmRedirect />} />
              <Route
                path="/progress"
                element={
                  <PlaceholderPage
                    kicker="PROGRESS"
                    title="تقدمي"
                    description="تفاصيل الإتقان ونبض التعلم ستُعرض هنا باستخدام نفس خدمات الإتقان."
                  />
                }
              />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/history/:sessionId" element={<HistoryPage />} />
              <Route
                path="/review"
                element={
                  <PlaceholderPage
                    kicker="REVIEW"
                    title="مراجعة الضعيف"
                    description="مسار المراجعة مربوط بمفاهيم الإتقان المنخفضة. الشاشة التفصيلية قادمة."
                  />
                }
              />
              <Route
                path="/settings"
                element={
                  <PlaceholderPage
                    kicker="SETTINGS"
                    title="الإعدادات"
                    description="تفضيلات الوصول وأنماط التعلم ستُدار من هنا لاحقاً."
                  />
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </StudentMetaProvider>
    </AuthProvider>
  );
}
