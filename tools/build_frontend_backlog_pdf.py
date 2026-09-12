from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "pendencias-frontend-smartpet-trello.pdf"

NAVY = colors.HexColor("#183B5B")
BLUE = colors.HexColor("#3296FA")
ORANGE = colors.HexColor("#FF6B00")
INK = colors.HexColor("#263446")
MUTED = colors.HexColor("#64748B")
LINE = colors.HexColor("#DCE5EE")
PALE_BLUE = colors.HexColor("#EEF7FF")
PALE_ORANGE = colors.HexColor("#FFF4EB")
PALE_YELLOW = colors.HexColor("#FFF9E7")
WHITE = colors.white


def paragraph(text, style):
    return Paragraph(text, style)


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setTitle("Pendencias do frontend SmartPet Hub")
    canvas.setAuthor("SmartPet Hub")
    width, _ = A4
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 9.5 * mm, "SmartPet Hub - backlog do frontend")
    canvas.drawRightString(width - 18 * mm, 9.5 * mm, f"Pagina {doc.page}")
    canvas.restoreState()


def card(title, priority, current, delivery, styles, background=WHITE):
    heading = paragraph(title, styles["card_title"])
    priority_tag = paragraph(priority, styles["priority"])
    header = Table([[heading, priority_tag]], colWidths=[128 * mm, 32 * mm])
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    body = [
        header,
        paragraph("<b>Situacao atual</b> - " + current, styles["body"]),
        Spacer(1, 2 * mm),
        paragraph("<b>Pronto quando</b> - " + delivery, styles["body"]),
    ]
    table = Table([[body]], colWidths=[166 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.65, LINE),
        ("LINEBEFORE", (0, 0), (0, 0), 3, BLUE),
        ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
    ]))
    return KeepTogether([table, Spacer(1, 4 * mm)])


def heading(title, subtitle, styles):
    return [
        paragraph(title, styles["section"]),
        paragraph(subtitle, styles["subtitle"]),
        Spacer(1, 5 * mm),
    ]


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUTPUT), pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=17 * mm, bottomMargin=21 * mm,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=add_page_number)])

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("cover_kicker", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=BLUE, spaceAfter=8))
    styles.add(ParagraphStyle("cover_title", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=27, leading=32, textColor=NAVY, spaceAfter=10))
    styles.add(ParagraphStyle("cover_body", parent=styles["BodyText"], fontName="Helvetica", fontSize=12, leading=18, textColor=INK))
    styles.add(ParagraphStyle("section", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=NAVY, spaceAfter=4))
    styles.add(ParagraphStyle("subtitle", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.5, leading=13, textColor=MUTED))
    styles.add(ParagraphStyle("card_title", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=11.5, leading=14, textColor=NAVY))
    styles.add(ParagraphStyle("priority", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=ORANGE, alignment=TA_CENTER, borderColor=colors.HexColor("#F8CDAF"), borderWidth=0.5, borderPadding=4, borderRadius=6, backColor=PALE_ORANGE))
    styles.add(ParagraphStyle("body", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.1, leading=13, textColor=INK))
    styles.add(ParagraphStyle("small", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.4, leading=11.5, textColor=MUTED))
    styles.add(ParagraphStyle("table_head", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=8.6, leading=10.5, textColor=WHITE))
    styles.add(ParagraphStyle("table_cell", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.25, leading=11, textColor=INK))

    story = []
    story += [
        Spacer(1, 23 * mm),
        paragraph("DOCUMENTO PARA ORGANIZACAO NO TRELLO", styles["cover_kicker"]),
        paragraph("Pendencias do frontend\nSmartPet Hub", styles["cover_title"]),
        paragraph("Revisao do codigo atual para concluir a interface antes da integracao com o backend.", styles["cover_body"]),
        Spacer(1, 14 * mm),
    ]
    summary = [
        [paragraph("Ja entregue", styles["table_head"]), paragraph("Ainda falta", styles["table_head"])],
        [paragraph("Login demonstrativo por perfil, dashboard integrado, CRUD de tutores e pets, criacao de agendamentos, cadastro/exclusao de servicos e layout responsivo.", styles["table_cell"]), paragraph("Ciclo de atendimento, edicao de servicos, relatorios reais, ciclo de vida de cadastros, gestao visual de funcionarios e testes de interface.", styles["table_cell"])],
    ]
    table = Table(summary, colWidths=[83 * mm, 83 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), BLUE),
        ("BACKGROUND", (1, 0), (1, 0), ORANGE),
        ("BACKGROUND", (0, 1), (0, 1), PALE_BLUE),
        ("BACKGROUND", (1, 1), (1, 1), PALE_ORANGE),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.55, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
    ]))
    story += [table, Spacer(1, 13 * mm)]
    story += [paragraph("Como usar este PDF", styles["section"])]
    story += [paragraph("Cada bloco das paginas seguintes pode ser copiado como um cartao do Trello. A prioridade indica a ordem sugerida para concluir a experiencia do frontend.", styles["cover_body"])]
    story.append(PageBreak())

    story += heading("1. Operacao diaria", "Cartoes que fecham o uso real da agenda e do catalogo de servicos.", styles)
    story.append(card(
        "Ciclo completo do agendamento", "ALTA", 
        "A agenda cria e lista agendamentos por data. Os status existem nos dados, mas nao ha botoes ou funcoes para confirmar, concluir, cancelar, editar ou reagendar um atendimento.",
        "Cada agendamento deve abrir detalhes e permitir confirmar, concluir, cancelar, editar ou reagendar. A lista e o dashboard devem refletir imediatamente o novo status.",
        styles, PALE_BLUE))
    story.append(card(
        "Edicao de servicos", "ALTA",
        "O gerente pode cadastrar e excluir servicos. O botao de editar esta visivel e informa que a funcao esta em desenvolvimento.",
        "O gerente deve editar nome, preco, duracao e descricao. A agenda deve mostrar o valor atualizado sem perder historico de atendimentos ja registrados.",
        styles, PALE_ORANGE))
    story.append(card(
        "Preco estruturado e regras de capacidade", "MEDIA",
        "O preco do servico e salvo como texto, por exemplo R$ 45,00. O conflito atual impede apenas que o mesmo pet tenha dois horarios iguais.",
        "Salvar preco em valor numerico, formatar na interface e definir a regra de agenda: capacidade por horario, profissional ou recurso. Exibir uma mensagem clara quando nao houver disponibilidade.",
        styles, PALE_YELLOW))
    story.append(PageBreak())

    story += heading("2. Gestao e indicadores", "Cartoes para transformar as telas prontas em informacoes operacionais reais.", styles)
    story.append(card(
        "Relatorios dinamicos", "ALTA",
        "Relatorios esta bem desenhada e protegida para gerente, mas receita, graficos, ranking, periodo e percentuais sao arrays fixos de demonstracao.",
        "Calcular indicadores a partir dos agendamentos concluidos e dos precos de servicos. Incluir filtro de periodo, estados vazios e ranking real de servicos.",
        styles, PALE_BLUE))
    story.append(card(
        "Ciclo de vida de tutores e pets", "MEDIA",
        "A exclusao e bloqueada quando ha pets ou historico de atendimento, o que preserva dados corretamente. Porem nao existe fluxo para transferir pet, inativar ou arquivar cadastro.",
        "Oferecer transferencia de pet para outro tutor e status ativo/inativo ou arquivado. Listas e buscas devem permitir consultar registros inativos sem usa-los em novos agendamentos.",
        styles, PALE_ORANGE))
    story.append(card(
        "Dados temporais do cadastro", "BAIXA",
        "O dashboard mostra pets cadastrados recentemente pela ordem atual da lista. O modelo nao armazena data de criacao ou atualizacao.",
        "Adicionar createdAt e updatedAt aos registros e usar esses campos para ordenar recentes, auditar alteracoes e preparar sincronizacao futura com a API.",
        styles, PALE_YELLOW))
    story.append(PageBreak())

    story += heading("3. Equipe, qualidade<br/>e integracao futura", "Cartoes para evoluir da demonstracao para um produto completo.", styles)
    story.append(card(
        "Gestao visual de funcionarios", "MEDIA",
        "Ha login de demonstracao para gerente e atendente, com menus e relatorios restritos corretamente. As duas contas estao fixas no codigo.",
        "Criar area do gerente para listar, cadastrar, editar, inativar e redefinir acesso de funcionarios. Mostrar nome, perfil e situacao da conta no frontend.",
        styles, PALE_BLUE))
    story.append(card(
        "Perfil e recuperacao de acesso", "MEDIA",
        "A tela de login tem orientacao de recuperacao, mas nao ha tela de perfil, troca de senha visual ou fluxo de redefinicao.",
        "Criar telas e estados de interface para perfil do funcionario, alteracao de senha e pedido de recuperacao. A confirmacao real por email fica para o backend.",
        styles, PALE_ORANGE))
    story.append(card(
        "Testes de interface e jornadas", "MEDIA",
        "Ha 18 testes para regras de dados e persistencia local. Nao existem testes para login, permissoes, formularios, navegacao, responsividade ou jornada completa.",
        "Cobrir as jornadas: login como gerente/atendente, permissao de relatorios, tutor para pet para agendamento para conclusao e comportamento em celular e desktop.",
        styles, PALE_YELLOW))
    story.append(card(
        "Camada de API e estados de carregamento", "MEDIA",
        "Os dados sao persistidos no localStorage e os formularios ja usam um contexto central. Ainda nao ha cliente HTTP, carregamento, tentativa novamente ou erros de rede.",
        "Criar contratos de API, servicos de consulta/mutacao, esqueletos de carregamento e telas de erro. A autenticacao, seguranca e persistencia compartilhada ficam para o backend.",
        styles, PALE_BLUE))
    story.append(Spacer(1, 3 * mm))
    story.append(paragraph("Fora do escopo do frontend isolado: senha real, banco de dados, seguranca de autorizacao, recuperacao por email e dados compartilhados entre dispositivos. Essas partes dependem do backend, embora as telas e estados possam ser preparados agora.", styles["small"]))

    doc.build(story)


if __name__ == "__main__":
    build()
